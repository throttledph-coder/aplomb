import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Mic, Loader2, Sparkles, ArrowRight, RotateCcw, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Markdown } from '@/components/report/Markdown'
import { AudioRecorder } from '@/lib/audio/recorder'
import { scoreAnswer, FLAG_TIPS, type AnswerScore } from '@/lib/eval/answer-scorer'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'
import type { AnswerLength } from '@/lib/providers/types'
import type { InterviewSession, InterviewType, ParsedResumeData, Resume } from '@/types'

const TYPES: { value: InterviewType; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' },
  { value: 'system_design', label: 'System design' },
]

function resolveLength(v: string | null | undefined): AnswerLength {
  return v === 'concise' || v === 'detailed' || v === 'comprehensive' ? v : 'detailed'
}

type Phase = 'setup' | 'active'

// Mock-interview practice: generate likely questions for a role, answer each by
// voice or text, get an instant score + tips, and optionally a strong model
// answer. Fully in-memory (no live session) — free, repeatable prep.
export default function Practice() {
  const answerLengthSetting = useAppStore((s) => s.settings.answer_length)

  const [phase, setPhase] = useState<Phase>('setup')
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [type, setType] = useState<InterviewType>('mixed')
  const [jd, setJd] = useState('')

  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState<AnswerScore | null>(null)
  const [modelAnswer, setModelAnswer] = useState('')
  const [modelLoading, setModelLoading] = useState(false)
  const [recording, setRecording] = useState(false)

  const recRef = useRef<AudioRecorder | null>(null)
  const sessionRef = useRef<InterviewSession | null>(null)
  const resumeRef = useRef<ParsedResumeData | null>(null)

  useEffect(() => {
    if (!window.db) return
    void window.db.resume.list().then((rs) => {
      setResumes(rs)
      const def = rs.find((r) => r.is_default) ?? rs[0]
      if (def) setResumeId(def.id)
    })
  }, [])

  // Stop the mic on unmount.
  useEffect(() => () => recRef.current?.stop(), [])

  function stopMic() {
    recRef.current?.stop()
    recRef.current = null
    setRecording(false)
  }

  async function toggleMic() {
    if (recording) {
      stopMic()
      return
    }
    if (!window.ai) {
      toast.error('Voice answers need the desktop app + a Groq key.')
      return
    }
    const rec = new AudioRecorder()
    try {
      // Mic (system=false): transcribe each spoken segment into the answer box.
      await rec.startVadClips(async (clip) => {
        const bytes = new Uint8Array(await clip.arrayBuffer())
        try {
          const t = (await window.ai!.transcribe(bytes)).trim()
          if (t) setAnswer((prev) => (prev ? `${prev} ${t}` : t))
        } catch {
          /* ignore a dropped clip — keep recording */
        }
      }, false)
    } catch (err) {
      toast.error(`Mic error: ${(err as Error).message}`)
      return
    }
    recRef.current = rec
    setRecording(true)
  }

  async function start() {
    if (!window.db || !window.ai || resumeId === null) return
    if (!jobTitle.trim()) {
      toast.error('Add a job title to tailor the questions.')
      return
    }
    setLoading(true)
    try {
      const r = await window.db.resume.get(resumeId)
      const parsed = r?.parsed_data ?? null
      if (!parsed) {
        toast.error('Could not load that resume.')
        return
      }
      const session = {
        id: 0,
        resume_id: resumeId,
        application_id: null,
        session_name: 'Practice',
        company: company.trim() || 'the company',
        job_title: jobTitle.trim(),
        interview_type: type,
        job_description: jd.trim(),
        parsed_jd: null,
        additional_info: null,
        status: 'active',
        duration_sec: 0,
        started_at: new Date().toISOString(),
        ended_at: null,
        coaching_report: null,
        keyword_matches: null,
        created_at: new Date().toISOString(),
      } as InterviewSession
      const qs = await window.ai.generateQuestions({ resume: parsed, session })
      if (qs.length === 0) {
        toast.error('No questions generated — check your Groq key in Settings.')
        return
      }
      resumeRef.current = parsed
      sessionRef.current = session
      setQuestions(qs)
      setIdx(0)
      resetTurn()
      setPhase('active')
    } catch (err) {
      toast.error(`Could not start practice: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  function resetTurn() {
    setAnswer('')
    setScore(null)
    setModelAnswer('')
  }

  function submit() {
    const a = answer.trim()
    if (!a) return
    stopMic()
    setScore(
      scoreAnswer(a, {
        question: questions[idx],
        length: resolveLength(answerLengthSetting),
        jd: jd.trim() || undefined,
      }),
    )
  }

  async function showModelAnswer() {
    if (!window.ai || !resumeRef.current || !sessionRef.current) return
    setModelLoading(true)
    try {
      const a = await window.ai.generateAnswer({
        question: questions[idx],
        resume: resumeRef.current,
        session: sessionRef.current,
      })
      setModelAnswer(a)
    } catch (err) {
      toast.error(`Couldn't draft a model answer: ${(err as Error).message}`)
    } finally {
      setModelLoading(false)
    }
  }

  function next() {
    stopMic()
    if (idx + 1 >= questions.length) {
      // Looped through all questions — back to setup for another round.
      toast.success('Nice — you went through every question.')
      setPhase('setup')
      return
    }
    setIdx((i) => i + 1)
    resetTurn()
  }

  // ---------- setup ----------
  if (phase === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Dumbbell className="h-6 w-6 text-primary" /> Practice
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A mock interview tailored to a role. Answer by voice or text, get an instant score and a
            strong model answer. Free and unlimited.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Set up your mock interview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Resume</Label>
              <Select
                value={resumeId !== null ? String(resumeId) : ''}
                onValueChange={(v) => setResumeId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={resumes.length ? 'Pick a resume' : 'No resumes yet'} />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role">Job title</Label>
                <Input
                  id="role"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Senior Frontend Engineer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co">Company (optional)</Label>
                <Input
                  id="co"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Focus</Label>
              <Select value={type} onValueChange={(v) => setType(v as InterviewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jd">Job description (optional — sharper questions)</Label>
              <textarea
                id="jd"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={4}
                placeholder="Paste the job description…"
                className="w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>

            <Button
              onClick={() => void start()}
              disabled={loading || resumeId === null}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generating questions…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Start practice
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------- active ----------
  const pct = score ? Math.round(score.score * 100) : 0
  const scoreTone =
    pct >= 75 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-destructive'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Dumbbell className="h-5 w-5 text-primary" /> Practice
        </h1>
        <span className="text-xs tabular-nums text-muted-foreground">
          Question {idx + 1} of {questions.length}
        </span>
      </div>

      <Card>
        <CardContent className="space-y-4 py-4">
          <p className="text-base font-medium">{questions[idx]}</p>

          <div className="rounded-xl border bg-card p-2 focus-within:border-primary/50">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="Type your answer, or tap the mic and say it out loud…"
              className="w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between pl-1">
              <button
                type="button"
                title={recording ? 'Stop recording' : 'Answer by voice'}
                aria-label={recording ? 'Stop recording' : 'Answer by voice'}
                onClick={() => void toggleMic()}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  recording && 'bg-primary/15 text-primary',
                )}
              >
                <Mic className="h-3.5 w-3.5" />
                {recording ? 'Listening…' : 'Voice'}
              </button>
              <Button size="sm" onClick={submit} disabled={!answer.trim()}>
                Score my answer
              </Button>
            </div>
          </div>

          {score && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <span className={cn('text-2xl font-semibold tabular-nums', scoreTone)}>{pct}</span>
                <span className="text-sm text-muted-foreground">/ 100 · {score.words} words</span>
              </div>
              {score.flags.length > 0 ? (
                <ul className="space-y-1">
                  {score.flags.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground">
                      • {FLAG_TIPS[f]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-500">Solid — well-sized, on-topic, first-person.</p>
              )}

              {modelAnswer ? (
                <div className="border-t pt-2">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    A strong answer
                  </p>
                  <Markdown text={modelAnswer} size="sm" tone="normal" />
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void showModelAnswer()}
                  disabled={modelLoading}
                >
                  {modelLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Drafting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Show a strong answer
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setPhase('setup')}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> New setup
        </Button>
        <Button size="sm" onClick={next}>
          {idx + 1 >= questions.length ? 'Finish' : 'Next question'}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
