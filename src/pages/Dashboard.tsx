import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileText,
  Radio,
  CalendarDays,
  Briefcase,
  CheckCircle2,
  Circle,
  TrendingUp,
  Target,
  Lightbulb,
  ArrowRight,
  AlarmClock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from '@/components/ui/popover'
import { useAppStore } from '@/store/app-store'
import { scoreAnswer } from '@/lib/eval/answer-scorer'
import { relativeWhen } from '@/lib/calendar/grouping'
import { eventsForDay, toLocalInput } from '@/lib/calendar/grid'
import { launchInterviewSession } from '@/lib/calendar/launch'
import { startSessionForJob } from '@/lib/sessions/start'
import { MiniCalendar } from '@/components/calendar/MiniCalendar'
import { summarize, type DashboardSummary } from '@/lib/dashboard/summary'
import {
  countdownLabel,
  timeAgo,
  createdWithin,
  typePerformance,
  recentActivity,
  type ActivityItem,
  type TypeStat,
} from '@/lib/dashboard/insights'
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_COLORS,
} from '@/lib/applications/status'
import { suggestNextAction, isStale, daysSinceActivity } from '@/lib/applications/actions'
import { cn } from '@/lib/utils'
import type { AnswerLength } from '@/lib/providers/types'
import type { Application, Interview, InterviewSession, InterviewType, Resume } from '@/types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Quiet stat card: big number + label + weekly delta; click opens a breakdown.
function StatCard({
  value,
  label,
  delta,
  children,
}: {
  value: number | string
  label: string
  delta?: number
  children: ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="group h-full w-full rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40">
          <p className="text-2xl font-semibold tabular-nums tracking-tight transition-colors group-hover:text-primary">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          {delta !== undefined && delta > 0 && (
            <p className="mt-1 text-[11px] font-medium text-emerald-500">
              ↑ {delta} this week
            </p>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        {children}
      </PopoverContent>
    </Popover>
  )
}

// One row in a breakdown popover: label · count.
function BreakdownRow({ label, count, dot }: { label: string; count: number; dot?: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="flex items-center gap-2">
        {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
        <span className="capitalize text-muted-foreground">{label}</span>
      </span>
      <span className="tabular-nums">{count}</span>
    </div>
  )
}

// Tiny labeled value for the Up-Next meta row.
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  )
}

// Preparation checklist row. Unchecked items with a fix become buttons — the
// checklist is a to-do list, not just status.
function CheckItem({ done, label, onFix }: { done: boolean; label: string; onFix?: () => void }) {
  const inner = (
    <>
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      )}
      <span className={done ? undefined : 'text-muted-foreground'}>{label}</span>
    </>
  )
  if (!done && onFix) {
    return (
      <button
        onClick={onFix}
        className="-mx-1.5 flex w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left text-sm transition-colors hover:bg-accent/50"
      >
        {inner}
      </button>
    )
  }
  return <p className="flex items-center gap-2 py-0.5 text-sm">{inner}</p>
}

// Tiny "View all →" section link.
function SectionLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {label} <ArrowRight className="h-3 w-3" />
    </button>
  )
}

const typeName = (t: InterviewType) => t.replace('_', ' ')

export default function Dashboard() {
  const navigate = useNavigate()
  const profile = useAppStore((s) => s.profile)
  const user = useAppStore((s) => s.user)
  const firstName =
    profile?.preferred_name?.trim() ||
    profile?.full_name?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    ''

  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [apps, setApps] = useState<Application[]>([])
  const [upcoming, setUpcoming] = useState<Interview[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [avgPct, setAvgPct] = useState<number | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [perf, setPerf] = useState<{ best?: TypeStat; worst?: TypeStat }>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!window.db) {
      setLoading(false)
      return
    }
    const [s, r, applications, allInterviews] = await Promise.all([
      window.db.session.list(),
      window.db.resume.list(),
      window.db.application.list(),
      window.db.interview.list(),
    ])
    setSessions(s)
    setResumes(r)
    setApps(applications)
    setInterviews(allInterviews)

    const nowMs = Date.now()
    setUpcoming(
      allInterviews.filter(
        (i) => i.status === 'upcoming' && new Date(i.scheduled_at).getTime() >= nowMs,
      ),
    )

    const length = (useAppStore.getState().settings.answer_length ?? 'detailed') as AnswerLength
    const qaLists = await Promise.all(s.map((x) => window.db.qa.list(x.id)))
    const scoresPct: number[] = []
    const pairs: { type: InterviewType; score: number }[] = []
    let total = 0
    for (let i = 0; i < qaLists.length; i++) {
      for (const qa of qaLists[i]) {
        total++
        if (qa.answer && qa.answer.trim()) {
          const pct = scoreAnswer(qa.answer, { question: qa.question, length }).score * 100
          scoresPct.push(pct)
          pairs.push({ type: s[i].interview_type, score: pct })
        }
      }
    }
    setQuestionCount(total)
    setAvgPct(
      scoresPct.length > 0
        ? Math.round(scoresPct.reduce((a, b) => a + b, 0) / scoresPct.length)
        : null,
    )
    setSummary(summarize(applications, s, scoresPct))
    setPerf(typePerformance(pairs))
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const now = new Date()
  const nextInterview = upcoming[0] ?? null
  const upcomingMore = upcoming.slice(1, 3)
  const nextResume = nextInterview?.resume_id
    ? resumes.find((r) => r.id === nextInterview.resume_id)
    : (resumes.find((r) => r.is_default) ?? resumes[0])

  const activity = recentActivity(sessions, interviews, apps)
  const todayEvents = eventsForDay(interviews, now)

  // Action queue: due/overdue next actions first (by due time), then stale
  // applications that need a nudge. The tracker tells you what to do next.
  const actionQueue = apps
    .filter((a) => a.status !== 'rejected')
    .map((a) => {
      const suggestion = suggestNextAction(a, interviews, now)
      const due = suggestion !== null && suggestion.due.getTime() <= now.getTime()
      return { app: a, suggestion, due, stale: isStale(a, now) }
    })
    .filter((x) => x.due || x.stale)
    .sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1
      return (a.suggestion?.due.getTime() ?? 0) - (b.suggestion?.due.getTime() ?? 0)
    })
    .slice(0, 5)

  // Real preparation state for the next interview — no fake checkmarks.
  const prepDone =
    nextInterview !== null &&
    sessions.some(
      (s) =>
        (nextInterview.application_id !== null &&
          s.application_id === nextInterview.application_id) ||
        (s.company.toLowerCase() === nextInterview.company.toLowerCase() &&
          s.job_title.toLowerCase() === nextInterview.job_title.toLowerCase()),
    )

  async function practiceNow(iv: Interview) {
    const resumeId = iv.resume_id ?? resumes.find((r) => r.is_default)?.id ?? resumes[0]?.id
    if (!resumeId) {
      navigate('/setup/resume')
      return
    }
    await startSessionForJob(
      {
        resumeId,
        company: iv.company,
        job_title: iv.job_title,
        interview_type: iv.interview_type,
        job_description: iv.job_description ?? '',
        additional_info: iv.additional_info,
        applicationId: iv.application_id,
      },
      navigate,
    )
  }

  function openActivity(a: ActivityItem) {
    if (a.kind === 'session') {
      const s = sessions.find((x) => x.id === a.id)
      navigate(s?.status === 'active' ? `/session/${a.id}` : `/report/${a.id}`)
    } else if (a.kind === 'interview') {
      navigate('/calendar')
    } else {
      navigate(`/applications/${a.id}`)
    }
  }

  const activityMeta: Record<ActivityItem['kind'], { icon: ReactNode; label: string }> = {
    session: { icon: <FileText className="h-4 w-4" />, label: 'Prep session' },
    interview: { icon: <CalendarDays className="h-4 w-4" />, label: 'Interview scheduled' },
    application: { icon: <Briefcase className="h-4 w-4" />, label: 'Application added' },
  }

  const insightItems: { icon: ReactNode; text: string; sub?: string }[] = []
  if (perf.best) {
    insightItems.push({
      icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
      text: `Strongest: ${typeName(perf.best.type)} — ${perf.best.avg}% avg`,
      sub: `${perf.best.n} scored answers`,
    })
  }
  if (perf.worst) {
    insightItems.push({
      icon: <Target className="h-4 w-4 text-primary" />,
      text: `Focus area: ${typeName(perf.worst.type)} — ${perf.worst.avg}% avg`,
      sub: 'Run a prep session on this interview type.',
    })
  }
  if (summary && questionCount > 0) {
    insightItems.push({
      icon: <Lightbulb className="h-4 w-4 text-muted-foreground" />,
      text: `${questionCount} questions practiced across ${summary.totalSessions} sessions`,
      sub: avgPct !== null ? `${avgPct}% overall average score` : undefined,
    })
  }

  const sectionTitle = 'text-xs font-medium uppercase tracking-wide text-muted-foreground'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-light tracking-tight">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="hidden shrink-0 text-sm text-muted-foreground sm:block">
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Command-center grid: work on the left, time + pipeline rail on the right */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-8">
          {/* Up next — the primary surface, task-first */}
          {loading ? (
            <Skeleton className="h-44" />
          ) : nextInterview ? (
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <p className={cn('flex items-center gap-2', sectionTitle)}>
                  <CalendarDays className="h-3.5 w-3.5 text-primary" /> Up next
                </p>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {countdownLabel(nextInterview.scheduled_at, now)}
                </span>
              </div>

              <div className="mt-3 grid gap-5 sm:grid-cols-[minmax(0,1fr)_190px]">
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium">
                    {nextInterview.company} — {nextInterview.job_title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {nextInterview.round_name?.trim() || typeName(nextInterview.interview_type)}
                    </Badge>
                    {nextResume && (
                      <span className="truncate text-xs text-muted-foreground">
                        Resume: {nextResume.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <Meta
                      label="Date"
                      value={new Date(nextInterview.scheduled_at).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    />
                    <Meta
                      label="Time"
                      value={new Date(nextInterview.scheduled_at).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    />
                    <Meta label="Duration" value={`${nextInterview.duration_min} min`} />
                  </div>
                  {nextInterview.location && (
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {nextInterview.location}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Button onClick={() => void launchInterviewSession(nextInterview, navigate)}>
                      <Radio className="mr-2 h-4 w-4" /> Start live session
                    </Button>
                    <Button variant="outline" onClick={() => void practiceNow(nextInterview)}>
                      Practice now
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost">Details</Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-72">
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {nextInterview.job_description && (
                            <p className="line-clamp-4">{nextInterview.job_description}</p>
                          )}
                          {nextInterview.notes?.trim() && (
                            <p className="italic">{nextInterview.notes}</p>
                          )}
                          {upcomingMore.length > 0 && (
                            <p className="border-t pt-2">
                              Then:{' '}
                              {upcomingMore
                                .map((i) => `${i.company} (${relativeWhen(i.scheduled_at, now)})`)
                                .join(' · ')}
                            </p>
                          )}
                          {!nextInterview.job_description &&
                            !nextInterview.notes?.trim() &&
                            upcomingMore.length === 0 && <p>No further details.</p>}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="border-t pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <p className={sectionTitle}>Preparation</p>
                  <div className="mt-2.5 space-y-1.5">
                    <CheckItem
                      done={Boolean(nextInterview.resume_id) || resumes.length > 0}
                      label="Resume attached"
                      onFix={() => navigate('/setup/resume')}
                    />
                    <CheckItem
                      done={Boolean(nextInterview.job_description?.trim())}
                      label="Job description added"
                      onFix={() =>
                        navigate('/calendar', { state: { editInterview: nextInterview.id } })
                      }
                    />
                    <CheckItem
                      done={prepDone}
                      label="Prep session completed"
                      onFix={() => void practiceNow(nextInterview)}
                    />
                    <CheckItem
                      done={Boolean(nextInterview.notes?.trim())}
                      label="Notes added"
                      onFix={() =>
                        navigate('/calendar', { state: { editInterview: nextInterview.id } })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-5">
              <p className="text-lg font-medium">Ready for your next interview?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sessions[0]
                  ? `Your last prep: ${sessions[0].company} — ${sessions[0].job_title}`
                  : 'Set up your resume and a job description to begin.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={() => navigate('/setup/resume')}>
                  <Plus className="mr-2 h-4 w-4" /> Start prep
                </Button>
                <Button variant="outline" onClick={() => navigate('/calendar')}>
                  <CalendarDays className="mr-2 h-4 w-4" /> Schedule interview
                </Button>
              </div>
            </div>
          )}

          {/* Action queue — what needs your attention right now */}
          {!loading && actionQueue.length > 0 && (
            <section>
              <h2 className={cn(sectionTitle, 'mb-2')}>Action queue</h2>
              <div className="divide-y divide-border">
                {actionQueue.map(({ app: a, suggestion, due }) => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/applications/${a.id}`)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/50"
                  >
                    <AlarmClock
                      className={cn(
                        'h-4 w-4 shrink-0',
                        due ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {due && suggestion ? suggestion.action : 'Nudge this application'} —{' '}
                        {a.company}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {due ? a.job_title : `No movement in ${daysSinceActivity(a, now)} days`}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Stat cards */}
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-3 items-stretch gap-3">
              <StatCard
                value={summary.totalSessions}
                label="Sessions"
                delta={createdWithin(sessions.map((s) => s.started_at), 7, now)}
              >
                <p className="mb-2 text-sm font-medium">Sessions by type</p>
                {Object.entries(summary.sessionsByType)
                  .filter(([, n]) => n > 0)
                  .map(([t, n]) => (
                    <BreakdownRow key={t} label={t.replace('_', ' ')} count={n} />
                  ))}
                {summary.totalSessions === 0 && (
                  <p className="text-sm text-muted-foreground">No sessions yet.</p>
                )}
                <PopoverClose asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full justify-start"
                    onClick={() => navigate('/history')}
                  >
                    View history
                  </Button>
                </PopoverClose>
              </StatCard>

              <StatCard
                value={summary.totalApps}
                label="Applications"
                delta={createdWithin(apps.map((a) => a.created_at), 7, now)}
              >
                <p className="mb-2 text-sm font-medium">Pipeline</p>
                {APPLICATION_STATUSES.filter((s) => summary.appsByStatus[s.value] > 0).map((s) => (
                  <BreakdownRow
                    key={s.value}
                    label={s.label}
                    count={summary.appsByStatus[s.value]}
                    dot={APPLICATION_STATUS_COLORS[s.value]
                      .split(' ')
                      .find((c) => c.startsWith('bg-'))}
                  />
                ))}
                {summary.totalApps === 0 && (
                  <p className="text-sm text-muted-foreground">No applications tracked.</p>
                )}
                <PopoverClose asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full justify-start"
                    onClick={() => navigate('/applications')}
                  >
                    View applications
                  </Button>
                </PopoverClose>
              </StatCard>

              <StatCard
                value={upcoming.length}
                label="Upcoming interviews"
                delta={createdWithin(interviews.map((i) => i.created_at), 7, now)}
              >
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
                ) : (
                  upcoming.slice(0, 4).map((iv) => (
                    <div key={iv.id} className="py-1 text-sm">
                      <p className="truncate font-medium">{iv.company}</p>
                      <p className="text-xs text-primary">{relativeWhen(iv.scheduled_at, now)}</p>
                    </div>
                  ))
                )}
                <PopoverClose asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full justify-start"
                    onClick={() => navigate('/calendar')}
                  >
                    Open calendar
                  </Button>
                </PopoverClose>
              </StatCard>
            </div>
          ) : null}

          {/* Insights + Recent activity — only when there's something to say */}
          {!loading && (insightItems.length > 0 || activity.length > 0) && (
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
              {insightItems.length > 0 && (
                <section>
                  <h2 className={cn(sectionTitle, 'mb-2')}>Insights</h2>
                  <div className="space-y-3">
                    {insightItems.map((it, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0">{it.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm">{it.text}</p>
                          {it.sub && <p className="text-xs text-muted-foreground">{it.sub}</p>}
                        </div>
                      </div>
                    ))}
                    <SectionLink label="View history" onClick={() => navigate('/history')} />
                  </div>
                </section>
              )}

              {activity.length > 0 && (
                <section>
                  <h2 className={cn(sectionTitle, 'mb-2')}>Recent activity</h2>
                  <div className="divide-y divide-border">
                    {activity.map((a) => (
                      <button
                        key={`${a.kind}-${a.id}`}
                        onClick={() => openActivity(a)}
                        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/50"
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {activityMeta[a.kind].icon}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-sm">
                          {activityMeta[a.kind].label} —{' '}
                          <span className="font-medium">{a.company}</span>
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeAgo(a.at, now)}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Right rail — calendar (with today's agenda) + pipeline */}
        <aside className="min-w-0 space-y-8">
          <section>
            <h2 className={cn(sectionTitle, 'mb-2')}>Calendar</h2>
            {loading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="rounded-lg border bg-card p-3">
                <MiniCalendar
                  items={interviews}
                  now={now}
                  onLaunch={(iv) => void launchInterviewSession(iv, navigate)}
                  onSchedule={(day) => {
                    const d = new Date(day)
                    d.setHours(10, 0, 0, 0)
                    navigate('/calendar', {
                      state: { newInterview: { scheduled_at: toLocalInput(d) } },
                    })
                  }}
                  onOpen={() => navigate('/calendar')}
                />
                {todayEvents.length > 0 && (
                  <div className="mt-2 border-t pt-1">
                    {todayEvents.map((iv) => (
                      <button
                        key={iv.id}
                        onClick={() => navigate('/calendar')}
                        className="block w-full rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-accent/50"
                      >
                        <p
                          className={cn(
                            'truncate text-sm font-medium',
                            iv.status === 'cancelled' && 'text-muted-foreground line-through',
                          )}
                        >
                          <span className="tabular-nums text-primary">
                            {new Date(iv.scheduled_at).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>{' '}
                          {iv.company}
                        </p>
                        <p className="truncate text-xs capitalize text-muted-foreground">
                          {iv.round_name?.trim() || typeName(iv.interview_type)} ·{' '}
                          {iv.duration_min} min
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {!loading && summary && summary.totalApps > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className={sectionTitle}>Pipeline</h2>
                <SectionLink label="View all" onClick={() => navigate('/applications')} />
              </div>
              <button
                onClick={() => navigate('/applications')}
                className="block w-full text-left"
                aria-label="View applications"
              >
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  {APPLICATION_STATUSES.filter((s) => summary.appsByStatus[s.value] > 0).map(
                    (s) => (
                      <div
                        key={s.value}
                        className={APPLICATION_STATUS_COLORS[s.value]
                          .split(' ')
                          .find((c) => c.startsWith('bg-'))}
                        style={{
                          width: `${(summary.appsByStatus[s.value] / summary.totalApps) * 100}%`,
                        }}
                      />
                    ),
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {APPLICATION_STATUSES.filter((s) => summary.appsByStatus[s.value] > 0).map(
                    (s) => (
                      <span
                        key={s.value}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            APPLICATION_STATUS_COLORS[s.value]
                              .split(' ')
                              .find((c) => c.startsWith('bg-')),
                          )}
                        />
                        {s.label}{' '}
                        <span className="tabular-nums text-foreground">
                          {summary.appsByStatus[s.value]}
                        </span>
                      </span>
                    ),
                  )}
                </div>
              </button>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
