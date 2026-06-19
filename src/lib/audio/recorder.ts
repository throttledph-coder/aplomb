// Microphone capture for auto-listen (roadmap 6.1). Renderer-only (browser APIs).
// Emits ~3s audio chunks and exposes a live input level.

const CHUNK_MS = 3000

export type ChunkHandler = (chunk: Blob) => void

export class AudioRecorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private audioCtx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private data: Uint8Array<ArrayBuffer> | null = null
  private clipActive = false
  private vadPoll: ReturnType<typeof setInterval> | null = null

  // Open an audio stream. system=true captures system/loopback audio (the
  // interviewer's voice) via getDisplayMedia; otherwise the local microphone.
  private async openAudio(system: boolean): Promise<void> {
    if (system) {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      display.getVideoTracks().forEach((t) => t.stop())
      const audioTracks = display.getAudioTracks()
      if (audioTracks.length === 0) {
        display.getTracks().forEach((t) => t.stop())
        throw new Error('No system audio. Share a screen/window WITH audio.')
      }
      this.stream = new MediaStream(audioTracks)
    } else {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    }
    // Level/frequency metering via WebAudio.
    this.audioCtx = new AudioContext()
    const source = this.audioCtx.createMediaStreamSource(this.stream)
    this.analyser = this.audioCtx.createAnalyser()
    this.analyser.fftSize = 256
    source.connect(this.analyser)
    this.data = new Uint8Array(this.analyser.frequencyBinCount)
  }

  async start(onChunk: ChunkHandler, system = false): Promise<void> {
    await this.openAudio(system)
    this.recorder = new MediaRecorder(this.stream!)
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) onChunk(e.data)
    }
    this.recorder.start(CHUNK_MS)
  }

  /**
   * Record back-to-back COMPLETE audio clips of ~`ms` each, calling `onClip`
   * with a self-contained webm Blob (decodable by Whisper). Restarts until stop().
   */
  async startClips(ms: number, onClip: (clip: Blob) => void, system = false): Promise<void> {
    await this.openAudio(system)
    this.clipActive = true

    const recordOne = () => {
      if (!this.clipActive || !this.stream) return
      const rec = new MediaRecorder(this.stream)
      const parts: Blob[] = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) parts.push(e.data)
      }
      rec.onstop = () => {
        if (parts.length > 0) onClip(new Blob(parts, { type: rec.mimeType || 'audio/webm' }))
        if (this.clipActive) recordOne()
      }
      this.recorder = rec
      rec.start()
      setTimeout(() => {
        if (rec.state === 'recording') rec.stop()
      }, ms)
    }
    recordOne()
  }

  /**
   * Voice-activity segmented clips: starts a fresh recorder when speech begins
   * and stops it on a sustained pause (or a hard cap), so each emitted Blob is
   * one COMPLETE utterance — questions aren't split across fixed windows. Each
   * segment is its own headered webm (decodable by Whisper). Runs until stop().
   */
  async startVadClips(onClip: (clip: Blob) => void, system = false): Promise<void> {
    await this.openAudio(system)
    this.clipActive = true

    // Speech/noise gating (all tunable). A segment only starts after a couple of
    // consecutive loud polls (rejects keyboard clacks/clicks), the gate floats
    // above a rolling noise-floor estimate (handles a steady-noisy room), and a
    // finished segment is only emitted if it actually held speech-level energy
    // (drops noise-only clips → fewer Whisper calls + fewer hallucinations).
    const START = 0.045 // base speech-onset level threshold
    const MARGIN = 0.03 // how far above the noise floor counts as speech
    const ONSET_POLLS = 2 // consecutive loud polls required to open a segment
    const MIN_LOUD_FRAMES = 3 // a real utterance has at least this many loud polls
    const SILENCE_MS = 900 // pause that ends an utterance
    const MIN_MS = 1200 // ignore ultra-short blips
    const MAX_MS = 14000 // hard cap so a long monologue still flushes
    const POLL = 100

    let rec: MediaRecorder | null = null
    let parts: Blob[] = []
    let segStart = 0
    let lastLoud = 0
    let onsetCount = 0 // consecutive loud polls while idle
    let loudFrames = 0 // loud polls within the current segment
    let segPeak = 0 // peak level within the current segment
    let noiseFloor = START // EMA of the ambient (non-speech) level

    const beginSeg = () => {
      if (!this.stream) return
      parts = []
      loudFrames = 0
      segPeak = 0
      const r = new MediaRecorder(this.stream)
      r.ondataavailable = (e) => {
        if (e.data.size > 0) parts.push(e.data)
      }
      r.onstop = () => {
        const wasSpeech = loudFrames >= MIN_LOUD_FRAMES && segPeak >= noiseFloor + MARGIN
        if (wasSpeech && parts.length > 0) {
          onClip(new Blob(parts, { type: r.mimeType || 'audio/webm' }))
        }
        if (rec === r) rec = null
      }
      rec = r
      this.recorder = r
      segStart = Date.now()
      lastLoud = Date.now()
      r.start()
    }

    const endSeg = () => {
      if (rec && rec.state === 'recording') rec.stop() // onstop → maybe onClip
    }

    this.vadPoll = setInterval(() => {
      if (!this.clipActive || !this.stream) return
      const lvl = this.getAudioLevel()
      const now = Date.now()
      const gate = Math.max(START, noiseFloor + MARGIN)

      if (!rec) {
        // Idle: adapt the noise floor toward ambient and require a sustained onset.
        if (lvl > gate) {
          onsetCount += 1
          if (onsetCount >= ONSET_POLLS) {
            onsetCount = 0
            beginSeg()
          }
        } else {
          onsetCount = 0
          noiseFloor = noiseFloor * 0.95 + lvl * 0.05
        }
        return
      }

      // In a segment: measure speech energy, extend on speech, end on a pause.
      if (lvl > gate) {
        lastLoud = now
        loudFrames += 1
        if (lvl > segPeak) segPeak = lvl
      }
      const dur = now - segStart
      if (dur >= MAX_MS) {
        endSeg() // cap reached; next poll re-opens a segment if still talking
        return
      }
      if (dur >= MIN_MS && now - lastLoud >= SILENCE_MS) endSeg()
    }, POLL)
  }

  /** Current input level, 0..1 (RMS of the frequency data). */
  getAudioLevel(): number {
    if (!this.analyser || !this.data) return 0
    this.analyser.getByteFrequencyData(this.data)
    let sum = 0
    for (const v of this.data) sum += v * v
    return Math.min(1, Math.sqrt(sum / this.data.length) / 128)
  }

  /** `count` normalized band levels (0..1) for a sound-wave visualizer. */
  getBars(count = 5): number[] {
    if (!this.analyser || !this.data) return new Array(count).fill(0)
    this.analyser.getByteFrequencyData(this.data)
    const usable = Math.floor(this.data.length * 0.7) // skip the dead high end
    const step = Math.max(1, Math.floor(usable / count))
    const bars: number[] = []
    for (let i = 0; i < count; i++) {
      let sum = 0
      for (let j = 0; j < step; j++) sum += this.data[i * step + j] ?? 0
      bars.push(Math.min(1, sum / step / 200))
    }
    return bars
  }

  pause(): void {
    if (this.recorder?.state === 'recording') this.recorder.pause()
  }

  resume(): void {
    if (this.recorder?.state === 'paused') this.recorder.resume()
  }

  stop(): void {
    this.clipActive = false
    if (this.vadPoll !== null) {
      clearInterval(this.vadPoll)
      this.vadPoll = null
    }
    if (this.recorder?.state === 'recording') this.recorder.stop()
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.audioCtx?.close()
    this.recorder = null
    this.stream = null
    this.audioCtx = null
    this.analyser = null
    this.data = null
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording'
  }
}
