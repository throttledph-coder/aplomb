import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertTriangle, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReportSummary } from '@/components/report/ReportSummary'
import { KeywordAnalysis } from '@/components/report/KeywordAnalysis'
import { QAList } from '@/components/report/QAList'
import { analyzeKeywords } from '@/lib/keywords'
import type {
  InterviewSession,
  KeywordMatches,
  ParsedResumeData,
  QAPair,
} from '@/types'

const EMPTY_RESUME: ParsedResumeData = {
  skills: [],
  experience: [],
  education: [],
  projects: [],
  summary: '',
}

export default function SessionReport() {
  const navigate = useNavigate()
  const { id } = useParams()
  const sessionId = Number(id)

  const [session, setSession] = useState<InterviewSession | null>(null)
  const [resume, setResume] = useState<ParsedResumeData>(EMPTY_RESUME)
  const [qaPairs, setQaPairs] = useState<QAPair[]>([])
  const [report, setReport] = useState<string>('')
  const [keywords, setKeywords] = useState<KeywordMatches | null>(null)
  const [status, setStatus] = useState<'loading' | 'generating' | 'ready' | 'error'>('loading')

  const startedRef = useRef(false)

  const generate = useCallback(
    async (s: InterviewSession, r: ParsedResumeData, qa: QAPair[]) => {
      setStatus('generating')
      try {
        const km = analyzeKeywords(s.job_description, qa.map((p) => p.answer).join('\n'))
        const text = await window.ai.generateReport({ session: s, resume: r, qaPairs: qa })
        await window.db.session.update(s.id, { coaching_report: text, keyword_matches: km })
        setReport(text)
        setKeywords(km)
        setStatus('ready')
      } catch (err) {
        toast.error(`Report generation failed: ${(err as Error).message}. Set your key in Settings.`)
        setStatus('error')
      }
    },
    [],
  )

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (!window.db) {
      toast.error('Database unavailable.')
      navigate('/')
      return
    }
    void (async () => {
      const s = await window.db.session.get(sessionId)
      if (!s) {
        toast.error('Session not found.')
        navigate('/')
        return
      }
      const r = await window.db.resume.get(s.resume_id)
      const qa = await window.db.qa.list(sessionId)
      setSession(s)
      setResume(r?.parsed_data ?? EMPTY_RESUME)
      setQaPairs(qa)

      if (s.coaching_report) {
        setReport(s.coaching_report)
        setKeywords(s.keyword_matches)
        setStatus('ready')
      } else {
        await generate(s, r?.parsed_data ?? EMPTY_RESUME, qa)
      }
    })()
  }, [sessionId, navigate, generate])

  if (!session) {
    return <p className="text-sm text-muted-foreground">Loading report…</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Session Report: {session.company} — {session.job_title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {new Date(session.started_at).toLocaleDateString()}
          </p>
        </div>
        {session.application_id && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => navigate(`/applications/${session.application_id}`)}
          >
            <Briefcase className="mr-2 h-4 w-4" /> Open job
          </Button>
        )}
      </div>

      {status === 'generating' && (
        <Card>
          <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating your coaching report…
          </CardContent>
        </Card>
      )}

      {status === 'error' && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Could not generate the report. Check your AI key in Settings, then retry.
            </p>
            <Button onClick={() => void generate(session, resume, qaPairs)}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {status === 'ready' && (
        <>
          <ReportSummary session={session} questionCount={qaPairs.length} report={report} />
          <KeywordAnalysis matches={keywords} />
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">All Questions &amp; Answers</h2>
            <QAList items={qaPairs} />
          </section>
        </>
      )}
    </div>
  )
}
