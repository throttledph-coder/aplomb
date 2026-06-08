import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Clock, Briefcase, MessageSquare, Gauge, Target, Radio, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/store/app-store'
import { scoreAnswer } from '@/lib/eval/answer-scorer'
import { relativeWhen } from '@/lib/calendar/grouping'
import { launchInterviewSession } from '@/lib/calendar/launch'
import type { AnswerLength } from '@/lib/providers/types'
import type { Interview, InterviewSession, Resume } from '@/types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const plan = useAppStore((s) => s.plan)
  const profile = useAppStore((s) => s.profile)
  const user = useAppStore((s) => s.user)
  const firstName =
    profile?.preferred_name?.trim() ||
    profile?.full_name?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    ''
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [appCount, setAppCount] = useState(0)
  const [nextInterview, setNextInterview] = useState<Interview | null>(null)
  const [upcomingMore, setUpcomingMore] = useState<Interview[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [avgPct, setAvgPct] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.db) {
      setLoading(false)
      return
    }
    void (async () => {
      try {
        const [s, r, apps, interviews] = await Promise.all([
          window.db.session.list(),
          window.db.resume.list(),
          window.db.application.list(),
          window.db.interview.list(),
        ])
        setSessions(s)
        setResumes(r)
        setAppCount(apps.length)

        // Soonest upcoming interview still in the future (list is asc by date).
        const nowMs = Date.now()
        const upcoming = interviews.filter(
          (i) => i.status === 'upcoming' && new Date(i.scheduled_at).getTime() >= nowMs,
        )
        setNextInterview(upcoming[0] ?? null)
        setUpcomingMore(upcoming.slice(1, 3))

        // Questions practiced + average answer score across all sessions (small N).
        const length = (useAppStore.getState().settings.answer_length ?? 'detailed') as AnswerLength
        const qaLists = await Promise.all(s.map((x) => window.db.qa.list(x.id)))
        let total = 0
        let scoreSum = 0
        let scored = 0
        for (const list of qaLists) {
          for (const qa of list) {
            total++
            if (qa.answer && qa.answer.trim()) {
              scoreSum += scoreAnswer(qa.answer, { question: qa.question, length }).score
              scored++
            }
          }
        }
        setQuestionCount(total)
        setAvgPct(scored > 0 ? Math.round((scoreSum / scored) * 100) : null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {plan === 'premium'
            ? 'Premium plan — unlimited sessions + live auto-listen & stealth.'
            : 'Free plan — unlimited prep. Upgrade to Pro for live auto-listen + stealth.'}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[5.25rem]" />)
        ) : (
          <>
            <StatCard icon={<Target className="h-4 w-4" />} label="Sessions" value={sessions.length} />
            <StatCard icon={<Briefcase className="h-4 w-4" />} label="Applications" value={appCount} />
            <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Questions" value={questionCount} />
            {avgPct !== null && (
              <StatCard icon={<Gauge className="h-4 w-4" />} label="Avg score" value={`${avgPct}%`} />
            )}
          </>
        )}
      </div>

      {nextInterview ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-primary" /> Up next
                <span className="font-semibold normal-case tracking-normal text-primary">
                  · {relativeWhen(nextInterview.scheduled_at, new Date())}
                </span>
              </p>
              <p className="mt-1 truncate text-base font-medium">
                {nextInterview.company} — {nextInterview.job_title}
              </p>
              {upcomingMore.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Then:{' '}
                  {upcomingMore
                    .map((i) => `${i.company} (${relativeWhen(i.scheduled_at, new Date())})`)
                    .join(' · ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/calendar')}>
                View calendar
              </Button>
              <Button onClick={() => void launchInterviewSession(nextInterview, navigate)}>
                <Radio className="mr-2 h-4 w-4" />
                Start live session
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div>
              <p className="flex items-center gap-2 text-base font-medium">
                <Target className="h-4 w-4 text-primary" /> Ready for your next interview?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sessions[0]
                  ? `Your last prep: ${sessions[0].company} — ${sessions[0].job_title}`
                  : 'Set up your resume and a job description to begin.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/calendar')}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Schedule interview
              </Button>
              <Button onClick={() => navigate('/setup/resume')}>
                <Plus className="mr-2 h-4 w-4" />
                Start New Interview Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent Sessions</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No sessions yet. Start your first interview prep above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <Card
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(s.status === 'active' ? `/session/${s.id}` : `/report/${s.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(s.status === 'active' ? `/session/${s.id}` : `/report/${s.id}`)
                  }
                }}
                className="cursor-pointer transition-colors hover:bg-accent/40"
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium">
                      {s.company} — {s.job_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(s.started_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{s.interview_type}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Your Resumes</h2>
        <div className="grid grid-cols-2 gap-3">
          {resumes.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  {r.name}
                  {r.is_default && (
                    <Badge variant="outline" className="ml-auto">
                      Default
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {r.parsed_data.skills.slice(0, 5).join(' · ') || 'No skills parsed'}
              </CardContent>
            </Card>
          ))}
          <Card
            className="flex cursor-pointer items-center justify-center border-dashed text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/resumes')}
          >
            <CardContent className="flex items-center gap-2 py-8">
              <Plus className="h-4 w-4" />
              Add Resume
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
