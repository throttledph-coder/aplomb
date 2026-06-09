import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileText,
  Radio,
  CalendarDays,
  MoreHorizontal,
  Star,
  Trash2,
  RotateCcw,
  Briefcase,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAppStore } from '@/store/app-store'
import { scoreAnswer } from '@/lib/eval/answer-scorer'
import { relativeWhen } from '@/lib/calendar/grouping'
import { launchInterviewSession } from '@/lib/calendar/launch'
import { summarize, type DashboardSummary } from '@/lib/dashboard/summary'
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_COLORS,
} from '@/lib/applications/status'
import { cn } from '@/lib/utils'
import type { AnswerLength } from '@/lib/providers/types'
import type { Interview, InterviewSession, Resume } from '@/types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Inline, card-less stat: big number + label, click for a breakdown popover.
function Stat({
  value,
  label,
  info,
  children,
}: {
  value: number | string
  label: string
  info?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <button className="group flex flex-col items-start text-left">
            <span className="text-3xl font-semibold tabular-nums tracking-tight transition-colors group-hover:text-primary">
              {value}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          {children}
        </PopoverContent>
      </Popover>
      {info && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="mt-1 text-muted-foreground/60 hover:text-muted-foreground" aria-label={`About ${label}`}>
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[16rem]">{info}</TooltipContent>
        </Tooltip>
      )}
    </div>
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

// ⋯ actions menu built on a click popover.
function RowMenu({ items }: { items: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        {items.map((it) => (
          <PopoverClose asChild key={it.label}>
            <button
              onClick={it.onClick}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent',
                it.danger && 'text-destructive',
              )}
            >
              {it.icon}
              {it.label}
            </button>
          </PopoverClose>
        ))}
      </PopoverContent>
    </Popover>
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
  const [nextInterview, setNextInterview] = useState<Interview | null>(null)
  const [upcomingMore, setUpcomingMore] = useState<Interview[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [avgPct, setAvgPct] = useState<number | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteResume, setDeleteResume] = useState<Resume | null>(null)

  async function load() {
    if (!window.db) {
      setLoading(false)
      return
    }
    const [s, r, apps, interviews] = await Promise.all([
      window.db.session.list(),
      window.db.resume.list(),
      window.db.application.list(),
      window.db.interview.list(),
    ])
    setSessions(s)
    setResumes(r)

    const nowMs = Date.now()
    const upcoming = interviews.filter(
      (i) => i.status === 'upcoming' && new Date(i.scheduled_at).getTime() >= nowMs,
    )
    setNextInterview(upcoming[0] ?? null)
    setUpcomingMore(upcoming.slice(1, 3))

    const length = (useAppStore.getState().settings.answer_length ?? 'detailed') as AnswerLength
    const qaLists = await Promise.all(s.map((x) => window.db.qa.list(x.id)))
    const scoresPct: number[] = []
    let total = 0
    for (const list of qaLists) {
      for (const qa of list) {
        total++
        if (qa.answer && qa.answer.trim()) {
          scoresPct.push(scoreAnswer(qa.answer, { question: qa.question, length }).score * 100)
        }
      }
    }
    setQuestionCount(total)
    setAvgPct(
      scoresPct.length > 0
        ? Math.round(scoresPct.reduce((a, b) => a + b, 0) / scoresPct.length)
        : null,
    )
    setSummary(summarize(apps, s, scoresPct))
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function setDefaultResume(id: number) {
    if (!window.db) return
    await window.db.resume.setDefault(id)
    await load()
    toast.success('Default resume updated.')
  }

  async function confirmDeleteResume() {
    if (!deleteResume || !window.db) return
    await window.db.resume.delete(deleteResume.id)
    setDeleteResume(null)
    await load()
    toast.success('Resume deleted.')
  }

  const nextResume = nextInterview?.resume_id
    ? resumes.find((r) => r.id === nextInterview.resume_id)
    : undefined

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light tracking-tight">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {plan === 'premium'
            ? 'Premium — unlimited prep plus live auto-listen & stealth.'
            : 'Free — unlimited prep. Upgrade to Pro for live auto-listen & stealth.'}
        </p>
      </div>

      {/* Stats (inline, click for breakdown) */}
      {loading ? (
        <div className="flex gap-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-20" />
          ))}
        </div>
      ) : summary ? (
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <Stat value={summary.totalSessions} label="Sessions">
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
              <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={() => navigate('/history')}>
                View history
              </Button>
            </PopoverClose>
          </Stat>

          <Stat value={summary.totalApps} label="Applications">
            <p className="mb-2 text-sm font-medium">Pipeline</p>
            {APPLICATION_STATUSES.filter((s) => summary.appsByStatus[s.value] > 0).map((s) => (
              <BreakdownRow
                key={s.value}
                label={s.label}
                count={summary.appsByStatus[s.value]}
                dot={APPLICATION_STATUS_COLORS[s.value].split(' ').find((c) => c.startsWith('bg-'))}
              />
            ))}
            {summary.totalApps === 0 && (
              <p className="text-sm text-muted-foreground">No applications tracked.</p>
            )}
            <PopoverClose asChild>
              <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={() => navigate('/applications')}>
                View applications
              </Button>
            </PopoverClose>
          </Stat>

          <Stat value={questionCount} label="Questions">
            <p className="text-sm text-muted-foreground">
              {questionCount > 0
                ? `${questionCount} questions practiced across ${summary.totalSessions} sessions.`
                : 'No questions practiced yet.'}
            </p>
            <PopoverClose asChild>
              <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={() => navigate('/history')}>
                View history
              </Button>
            </PopoverClose>
          </Stat>

          {avgPct !== null && (
            <Stat
              value={`${avgPct}%`}
              label="Avg score"
              info="A heuristic 0–100 estimate from answer length and keyword coverage — a rough guide, not a grade."
            >
              <p className="mb-2 text-sm font-medium">Score distribution</p>
              <BreakdownRow label="Strong (75+)" count={summary.scoreBuckets.strong} dot="bg-emerald-500" />
              <BreakdownRow label="OK (50–74)" count={summary.scoreBuckets.ok} dot="bg-amber-500" />
              <BreakdownRow label="Weak (<50)" count={summary.scoreBuckets.weak} dot="bg-red-500" />
            </Stat>
          )}
        </div>
      ) : null}

      {/* Focus block — the only emphasized surface; holds the two primary CTAs */}
      {loading ? (
        <Skeleton className="h-28" />
      ) : nextInterview ? (
        <div className="rounded-lg border bg-card p-5">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-primary" /> Up next
            <span className="font-semibold normal-case tracking-normal text-primary">
              · {relativeWhen(nextInterview.scheduled_at, new Date())}
            </span>
          </p>
          <p className="mt-1 truncate text-lg font-medium">
            {nextInterview.company} — {nextInterview.job_title}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => void launchInterviewSession(nextInterview, navigate)}>
              <Radio className="mr-2 h-4 w-4" /> Start live session
            </Button>
            <Button variant="outline" onClick={() => navigate('/calendar')}>
              View calendar
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost">Details</Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <p className="text-sm font-medium">
                  {nextInterview.round_name?.trim() || nextInterview.interview_type}
                </p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>{nextInterview.duration_min} min{nextResume ? ` · ${nextResume.name}` : ''}</p>
                  {nextInterview.location && <p className="break-all">{nextInterview.location}</p>}
                  {nextInterview.job_description && (
                    <p className="line-clamp-3">{nextInterview.job_description}</p>
                  )}
                  {upcomingMore.length > 0 && (
                    <p className="border-t pt-2">
                      Then:{' '}
                      {upcomingMore
                        .map((i) => `${i.company} (${relativeWhen(i.scheduled_at, new Date())})`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
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

      {/* Recent sessions — hairline rows */}
      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent sessions
        </h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 py-3">
                <button
                  onClick={() => navigate(s.status === 'active' ? `/session/${s.id}` : `/report/${s.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium">
                    {s.company} — {s.job_title}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {new Date(s.started_at).toLocaleDateString()} · {s.interview_type.replace('_', ' ')}
                  </p>
                </button>
                <RowMenu
                  items={[
                    {
                      icon: <FileText className="h-4 w-4" />,
                      label: s.status === 'active' ? 'Resume session' : 'View report',
                      onClick: () => navigate(s.status === 'active' ? `/session/${s.id}` : `/report/${s.id}`),
                    },
                    ...(s.application_id
                      ? [
                          {
                            icon: <Briefcase className="h-4 w-4" />,
                            label: 'Open job',
                            onClick: () => navigate(`/applications/${s.application_id}`),
                          },
                        ]
                      : []),
                    {
                      icon: <RotateCcw className="h-4 w-4" />,
                      label: 'Reuse setup',
                      onClick: () =>
                        navigate('/setup/job', {
                          state: {
                            resumeId: s.resume_id,
                            prefill: {
                              company: s.company,
                              job_title: s.job_title,
                              interview_type: s.interview_type,
                              job_description: s.job_description,
                              additional_info: s.additional_info ?? '',
                            },
                          },
                        }),
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resumes — hairline rows */}
      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resumes
        </h2>
        {loading ? (
          <Skeleton className="h-12" />
        ) : (
          <div className="divide-y divide-border">
            {resumes.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {r.name}
                    {r.is_default && (
                      <Badge variant="outline" className="shrink-0">
                        Default
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.parsed_data.skills.slice(0, 6).join(' · ') || 'No skills parsed'}
                  </p>
                </div>
                <RowMenu
                  items={[
                    {
                      icon: <Radio className="h-4 w-4" />,
                      label: 'Use for new prep',
                      onClick: () => navigate('/setup/job', { state: { resumeId: r.id } }),
                    },
                    ...(!r.is_default
                      ? [
                          {
                            icon: <Star className="h-4 w-4" />,
                            label: 'Set as default',
                            onClick: () => void setDefaultResume(r.id),
                          },
                        ]
                      : []),
                    {
                      icon: <FileText className="h-4 w-4" />,
                      label: 'Manage resumes',
                      onClick: () => navigate('/resumes'),
                    },
                    {
                      icon: <Trash2 className="h-4 w-4" />,
                      label: 'Delete',
                      onClick: () => setDeleteResume(r),
                      danger: true,
                    },
                  ]}
                />
              </div>
            ))}
            <button
              onClick={() => navigate('/resumes')}
              className="flex w-full items-center gap-2 py-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add resume
            </button>
          </div>
        )}
      </section>

      {/* Resume delete confirm */}
      <Dialog open={deleteResume !== null} onOpenChange={(o) => !o && setDeleteResume(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete resume?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteResume?.name} will be removed. Past sessions that used it stay intact.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteResume(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDeleteResume()}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
