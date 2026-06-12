import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import type { AnswerLength } from '@/lib/providers/types'
import type { InterviewSession, ParsedResumeData, QAPair } from '@/types'

function resolveLength(value: string | null | undefined): AnswerLength {
  if (value === 'concise' || value === 'detailed' || value === 'comprehensive') return value
  return 'detailed'
}

function ageFrom(birthday?: string | null): number | undefined {
  if (!birthday) return undefined
  const d = new Date(birthday)
  if (Number.isNaN(d.getTime())) return undefined
  const age = Math.floor((Date.now() - d.getTime()) / 3.15576e10)
  return age > 0 && age < 120 ? age : undefined
}

export function useSession(sessionId: number) {
  const navigate = useNavigate()
  const answerLengthSetting = useAppStore((s) => s.settings.answer_length)
  const refreshActiveSession = useAppStore((s) => s.refreshActiveSession)
  const profile = useAppStore((s) => s.profile)

  const [session, setSession] = useState<InterviewSession | null>(null)
  const [resume, setResume] = useState<ParsedResumeData | null>(null)
  const [qaHistory, setQaHistory] = useState<QAPair[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  const lastQuestionRef = useRef<string | null>(null)

  // ---- load session + resume + history ----
  useEffect(() => {
    let cancelled = false
    if (!window.db) {
      setLoadError('Database unavailable.')
      return
    }
    void (async () => {
      try {
        const s = await window.db.session.get(sessionId)
        if (!s) {
          if (!cancelled) setLoadError('Session not found.')
          return
        }
        const r = await window.db.resume.get(s.resume_id)
        const hist = await window.db.qa.list(sessionId)
        if (cancelled) return
        setSession(s)
        setResume(r?.parsed_data ?? null)
        setQaHistory(hist)
        setElapsedSec(s.duration_sec)
      } catch (err) {
        if (!cancelled) setLoadError((err as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  // ---- timer ----
  useEffect(() => {
    if (!session || session.status !== 'active') return
    const t = setInterval(() => setElapsedSec((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [session])

  // Re-pull Q&A history (e.g. after the Focus overlay asked questions while
  // this window was hidden). Safe no-op while an answer is streaming.
  const reloadHistory = useCallback(async () => {
    if (!window.db) return
    const hist = await window.db.qa.list(sessionId)
    setQaHistory(hist)
  }, [sessionId])

  const runAnswer = useCallback(
    async (
      question: string,
      previous: QAPair[],
      lengthOverride?: AnswerLength,
    ): Promise<string | null> => {
      if (!session || !resume || !window.ai) return null
      setIsGenerating(true)
      setCurrentAnswer('')
      try {
        return await window.ai.streamAnswer(
          {
            question,
            resume,
            session,
            previousQA: previous.map((qa) => ({ q: qa.question, a: qa.answer })),
            answerLength: lengthOverride ?? resolveLength(answerLengthSetting),
            candidate: profile
              ? {
                  preferredName: profile.preferred_name ?? undefined,
                  pronouns:
                    profile.pronouns && profile.pronouns !== 'prefer not to say'
                      ? profile.pronouns
                      : undefined,
                  age: ageFrom(profile.birthday),
                }
              : undefined,
          },
          (token) => setCurrentAnswer((prev) => prev + token),
        )
      } catch (err) {
        const msg = (err as Error).message
        if (/429|rate.?limit/i.test(msg)) {
          toast.error('Groq rate limit hit — wait a few seconds, or add your own key in Settings.')
        } else {
          toast.error(`Answer generation failed: ${msg}`)
        }
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [session, resume, answerLengthSetting, profile],
  )

  const askQuestion = useCallback(
    async (question: string, opts?: { length?: AnswerLength }) => {
      const text = question.trim()
      if (!text || isGenerating || !session) return
      setCurrentQuestion(text)
      lastQuestionRef.current = text

      const started = Date.now()
      const answer = await runAnswer(text, qaHistory, opts?.length)
      if (answer === null) return

      const sequence_order = await window.db.qa.nextSequence(sessionId)
      const saved = await window.db.qa.create({
        session_id: sessionId,
        question: text,
        answer,
        question_source: 'manual',
        latency_ms: Date.now() - started,
        sequence_order,
      })
      setQaHistory((h) => [...h, saved])
      setCurrentAnswer('')
      setCurrentQuestion('')
    },
    [isGenerating, session, qaHistory, runAnswer, sessionId],
  )

  const regenerateAnswer = useCallback(async () => {
    const last = qaHistory[qaHistory.length - 1]
    if (!last || isGenerating) return
    const priorHistory = qaHistory.slice(0, -1)
    const answer = await runAnswer(last.question, priorHistory)
    if (answer === null) return
    const updated = await window.db.qa.update(last.id, {
      answer,
      answer_version: last.answer_version + 1,
    })
    if (updated) setQaHistory((h) => h.map((q) => (q.id === last.id ? updated : q)))
    setCurrentAnswer('')
  }, [qaHistory, isGenerating, runAnswer])

  const cancelGeneration = useCallback(() => {
    void window.ai?.cancelStream()
  }, [])

  const endSession = useCallback(async () => {
    if (window.db) await window.db.session.end(sessionId, elapsedSec)
    await refreshActiveSession()
    navigate(`/report/${sessionId}`)
  }, [sessionId, elapsedSec, navigate, refreshActiveSession])

  return {
    session,
    resume,
    qaHistory,
    currentQuestion,
    currentAnswer,
    isGenerating,
    elapsedSec,
    loadError,
    askQuestion,
    regenerateAnswer,
    cancelGeneration,
    endSession,
    reloadHistory,
  }
}
