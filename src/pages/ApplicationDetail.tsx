import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Sparkles,
  FileText,
  Loader2,
  Copy,
  Radio,
  CalendarPlus,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Markdown } from '@/components/report/Markdown'
import { cn } from '@/lib/utils'
import {
  APPLICATION_STATUSES as STATUSES,
  APPLICATION_STATUS_COLORS as STATUS_COLORS,
} from '@/lib/applications/status'
import { relativeWhen } from '@/lib/calendar/grouping'
import { suggestNextAction } from '@/lib/applications/actions'
import { launchInterviewSession } from '@/lib/calendar/launch'
import { startSessionForJob } from '@/lib/sessions/start'
import type {
  Application,
  ApplicationStatus,
  Interview,
  InterviewSession,
  Resume,
} from '@/types'

interface EditDraft {
  company: string
  job_title: string
  job_url: string
  job_description: string
  notes: string
}

export default function ApplicationDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const appId = Number(id)

  const [app, setApp] = useState<Application | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<EditDraft | null>(null)
  const [aiBusy, setAiBusy] = useState<'fit' | 'cover' | null>(null)
  const [aiOutput, setAiOutput] = useState('')

  async function refresh() {
    if (!window.db || Number.isNaN(appId)) {
      setLoading(false)
      return
    }
    const [a, allInterviews, appSessions, rs] = await Promise.all([
      window.db.application.get(appId),
      window.db.interview.list(),
      window.db.session.listByApplication(appId),
      window.db.resume.list(),
    ])
    setApp(a)
    setInterviews(allInterviews.filter((iv) => iv.application_id === appId))
    setSessions(appSessions)
    setResumes(rs)
    if (resumeId === null) setResumeId((rs.find((r) => r.is_default) ?? rs[0])?.id ?? null)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId])

  async function setStatus(status: ApplicationStatus) {
    if (!app || !window.db) return
    await window.db.application.update(app.id, { status })
    await refresh()
  }

  async function saveEdit() {
    if (!edit || !app || !window.db) return
    if (!edit.company.trim() || !edit.job_title.trim()) {
      toast.error('Company and job title are required.')
      return
    }
    await window.db.application.update(app.id, {
      company: edit.company.trim(),
      job_title: edit.job_title.trim(),
      job_url: edit.job_url.trim() || null,
      job_description: edit.job_description.trim() || null,
      notes: edit.notes.trim() || null,
    })
    setEdit(null)
    await refresh()
    toast.success('Application updated.')
  }

  function scheduleInterview() {
    if (!app) return
    navigate('/calendar', {
      state: {
        newInterview: {
          application_id: app.id,
          company: app.company,
          job_title: app.job_title,
          job_description: app.job_description ?? '',
        },
      },
    })
  }

  async function prepNow() {
    if (!app || !window.db) return
    let rid = resumeId
    if (rid === null) {
      const def = await window.db.resume.getDefault()
      rid = def?.id ?? null
    }
    if (rid === null) {
      toast.error('Add a resume first.')
      navigate('/setup/resume')
      return
    }
    await startSessionForJob(
      {
        resumeId: rid,
        company: app.company,
        job_title: app.job_title,
        interview_type: 'mixed',
        job_description: app.job_description ?? '',
        applicationId: app.id,
      },
      navigate,
    )
  }

  async function runAi(kind: 'fit' | 'cover') {
    if (!app || !window.ai) return
    const resume = resumes.find((r) => r.id === resumeId)
    if (!resume) {
      toast.error('Select a resume first (add one in Resumes).')
      return
    }
    if (!app.job_description?.trim()) {
      toast.error('Add the job description first (Edit).')
      return
    }
    setAiBusy(kind)
    setAiOutput('')
    try {
      const input = {
        resume: resume.parsed_data,
        company: app.company || 'the company',
        jobTitle: app.job_title || 'the role',
        jobDescription: app.job_description,
      }
      setAiOutput(
        kind === 'fit'
          ? await window.ai.analyzeFit(input)
          : await window.ai.draftCoverLetter(input),
      )
    } catch (err) {
      toast.error(`AI failed: ${(err as Error).message}. Check your provider in Settings.`)
    } finally {
      setAiBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/applications')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Applications
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Application not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const upcoming = interviews.filter((iv) => iv.status === 'upcoming')
  const pastInterviews = interviews.filter((iv) => iv.status !== 'upcoming')
  const nextAction = suggestNextAction(app, interviews, new Date())

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/applications')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Applications
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{app.company}</h1>
              <p className="text-muted-foreground">{app.job_title}</p>
              {(app.location || app.salary_range || app.source) && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[app.location, app.salary_range, app.source].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={app.status} onValueChange={(v) => void setStatus(v as ApplicationStatus)}>
                <SelectTrigger className={cn('h-8 w-36', STATUS_COLORS[app.status])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {app.job_url && (
                <Button size="icon" variant="ghost" asChild title="Open job posting">
                  <a href={app.job_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                title="Edit"
                onClick={() =>
                  setEdit({
                    company: app.company,
                    job_title: app.job_title,
                    job_url: app.job_url ?? '',
                    job_description: app.job_description ?? '',
                    notes: app.notes ?? '',
                  })
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {nextAction && (
            <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate">
                <span className="font-medium">{nextAction.action}</span>
                <span className="text-muted-foreground">
                  {' '}· {relativeWhen(nextAction.due.toISOString(), new Date())}
                </span>
              </span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void prepNow()}>
              <Radio className="mr-2 h-4 w-4" /> Prep now
            </Button>
            <Button variant="outline" onClick={scheduleInterview}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Schedule interview
            </Button>
          </div>

          {app.notes && <p className="text-sm text-muted-foreground">{app.notes}</p>}
        </CardContent>
      </Card>

      {/* Interviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Interviews</CardTitle>
          <Button variant="ghost" size="sm" onClick={scheduleInterview}>
            <CalendarPlus className="mr-1.5 h-4 w-4" /> Schedule
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {interviews.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No interviews scheduled for this job yet.
            </p>
          ) : (
            <>
              {upcoming.map((iv) => (
                <div
                  key={iv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{iv.round_name?.trim() || iv.interview_type}</Badge>
                      <span className="text-sm font-medium text-primary">
                        {relativeWhen(iv.scheduled_at, new Date())}
                      </span>
                    </div>
                    {iv.location && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{iv.location}</p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => void launchInterviewSession(iv, navigate)}>
                    <Radio className="mr-1.5 h-4 w-4" /> Start live session
                  </Button>
                </div>
              ))}
              {pastInterviews.map((iv) => (
                <div
                  key={iv.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-3 opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{iv.status}</Badge>
                    <span className="text-sm">{relativeWhen(iv.scheduled_at, new Date())}</span>
                  </div>
                  {iv.session_id && (
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/report/${iv.session_id}`)}>
                      <FileText className="mr-1.5 h-4 w-4" /> Report
                    </Button>
                  )}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Prep sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Prep sessions</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void prepNow()}>
            <Radio className="mr-1.5 h-4 w-4" /> Prep now
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No prep sessions for this job yet.</p>
          ) : (
            sessions.map((s) => (
              <div
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
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md border p-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="capitalize">
                    {s.interview_type.replace('_', ' ')}
                  </Badge>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(s.started_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {s.status === 'active' ? 'In progress' : 'View report'}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* AI assistant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Resume:</span>
            <Select
              value={resumeId !== null ? String(resumeId) : ''}
              onValueChange={(v) => setResumeId(Number(v))}
            >
              <SelectTrigger className="h-8 w-44">
                <SelectValue placeholder="Select resume" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={aiBusy !== null} onClick={() => void runAi('fit')}>
              {aiBusy === 'fit' ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3.5 w-3.5" />
              )}
              Analyze fit
            </Button>
            <Button size="sm" variant="outline" disabled={aiBusy !== null} onClick={() => void runAi('cover')}>
              {aiBusy === 'cover' ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="mr-1 h-3.5 w-3.5" />
              )}
              Draft cover letter
            </Button>
          </div>
          {aiOutput && (
            <div className="space-y-2 border-t pt-3">
              <Markdown text={aiOutput} />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(aiOutput)
                  toast.success('Copied')
                }}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit application</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Input value={edit.company} onChange={(e) => setEdit({ ...edit, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Job title</Label>
                  <Input value={edit.job_title} onChange={(e) => setEdit({ ...edit, job_title: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Job URL</Label>
                <Input value={edit.job_url} onChange={(e) => setEdit({ ...edit, job_url: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Job description</Label>
                <Textarea
                  rows={5}
                  value={edit.job_description}
                  onChange={(e) => setEdit({ ...edit, job_description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEdit(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void saveEdit()}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
