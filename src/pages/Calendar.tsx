import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Plus,
  Trash2,
  Pencil,
  Radio,
  Check,
  X,
  MapPin,
  Clock,
  FileText,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  List,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'
import { groupByWhen, relativeWhen } from '@/lib/calendar/grouping'
import { addMonths, addWeeks, eventsForDay, monthLabel, weekRangeLabel } from '@/lib/calendar/grid'
import { launchInterviewSession } from '@/lib/calendar/launch'
import { MonthView } from '@/components/calendar/MonthView'
import { WeekView } from '@/components/calendar/WeekView'
import type { Application, Interview, InterviewType, Resume } from '@/types'

type CalView = 'month' | 'week' | 'agenda'

const TYPES: { value: InterviewType; label: string }[] = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' },
  { value: 'system_design', label: 'System design' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'other', label: 'Other' },
]

const REMIND_OPTIONS = [
  { value: '0', label: 'Off' },
  { value: '15', label: '15 min before' },
  { value: '30', label: '30 min before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
]

const typeLabel = (t: InterviewType) => TYPES.find((x) => x.value === t)?.label ?? t

interface DraftState {
  id: number | null
  application_id: number | null
  resume_id: number | null
  company: string
  job_title: string
  interview_type: InterviewType
  job_description: string
  round_name: string
  location: string
  scheduled_at: string // datetime-local value (YYYY-MM-DDTHH:mm)
  duration_min: number
  notes: string
  additional_info: string
  remind_day_of: boolean
  remind_mins_before: number
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}

function defaultWhen(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return toLocalInput(d)
}

function emptyDraft(): DraftState {
  return {
    id: null,
    application_id: null,
    resume_id: null,
    company: '',
    job_title: '',
    interview_type: 'behavioral',
    job_description: '',
    round_name: '',
    location: '',
    scheduled_at: defaultWhen(),
    duration_min: 45,
    notes: '',
    additional_info: '',
    remind_day_of: true,
    remind_mins_before: 30,
  }
}

export default function Calendar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState<Interview[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [apps, setApps] = useState<Application[]>([])
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Interview | null>(null)
  const [dayList, setDayList] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const [viewDate, setViewDate] = useState<Date>(() => new Date())
  const updateSetting = useAppStore((s) => s.updateSetting)
  const [view, setView] = useState<CalView>(() => {
    const v = useAppStore.getState().settings.calendar_view
    return v === 'week' || v === 'agenda' ? v : 'month'
  })

  function changeView(v: CalView) {
    setView(v)
    void updateSetting('calendar_view', v)
  }

  function step(dir: -1 | 1) {
    setViewDate((d) => (view === 'week' ? addWeeks(d, dir) : addMonths(d, dir)))
  }

  async function refresh() {
    if (!window.db) {
      setLoading(false)
      return
    }
    const [iv, rs, ap] = await Promise.all([
      window.db.interview.list(),
      window.db.resume.list(),
      window.db.application.list(),
    ])
    setItems(iv)
    setResumes(rs)
    setApps(ap)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  // Deep link from "Schedule interview" (Application detail) → open the add
  // dialog prefilled, then clear the router state so it won't reopen on back.
  useEffect(() => {
    const ni = (location.state as { newInterview?: Partial<DraftState> } | null)?.newInterview
    if (ni) {
      setDraft({ ...emptyDraft(), ...ni })
      navigate('.', { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep countdowns fresh + re-bucket as time passes.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const groups = useMemo(() => groupByWhen(items, now), [items, now])

  function openNew() {
    setDraft(emptyDraft())
  }

  function openEdit(iv: Interview) {
    setDraft({
      id: iv.id,
      application_id: iv.application_id,
      resume_id: iv.resume_id,
      company: iv.company,
      job_title: iv.job_title,
      interview_type: iv.interview_type,
      job_description: iv.job_description ?? '',
      round_name: iv.round_name ?? '',
      location: iv.location ?? '',
      scheduled_at: iv.scheduled_at.slice(0, 16),
      duration_min: iv.duration_min,
      notes: iv.notes ?? '',
      additional_info: iv.additional_info ?? '',
      remind_day_of: iv.remind_day_of,
      remind_mins_before: iv.remind_mins_before ?? 0,
    })
  }

  // Click an empty day (month) or hour slot (week) → open the add dialog dated to it.
  function openForDate(date: Date, withHour: boolean) {
    const d = new Date(date)
    if (!withHour) d.setHours(10, 0, 0, 0)
    setDraft({ ...emptyDraft(), scheduled_at: toLocalInput(d) })
  }

  function pickApplication(appId: string) {
    if (!draft) return
    if (appId === 'none') {
      setDraft({ ...draft, application_id: null })
      return
    }
    const a = apps.find((x) => x.id === Number(appId))
    if (!a) return
    setDraft({
      ...draft,
      application_id: a.id,
      company: a.company || draft.company,
      job_title: a.job_title || draft.job_title,
      job_description: a.job_description ?? draft.job_description,
    })
  }

  async function save() {
    if (!draft || !window.db) return
    if (!draft.company.trim() || !draft.job_title.trim()) {
      toast.error('Company and job title are required.')
      return
    }
    if (!draft.scheduled_at) {
      toast.error('Pick a date and time.')
      return
    }
    const payload = {
      application_id: draft.application_id,
      resume_id: draft.resume_id,
      company: draft.company.trim(),
      job_title: draft.job_title.trim(),
      interview_type: draft.interview_type,
      job_description: draft.job_description.trim() || null,
      round_name: draft.round_name.trim() || null,
      location: draft.location.trim() || null,
      scheduled_at: draft.scheduled_at,
      duration_min: draft.duration_min,
      notes: draft.notes.trim() || null,
      additional_info: draft.additional_info.trim() || null,
      remind_day_of: draft.remind_day_of,
      remind_mins_before: draft.remind_mins_before || 0,
    }
    if (draft.id === null) {
      await window.db.interview.create(payload)
    } else {
      // Editing the schedule re-arms reminders (clear the sent flags).
      await window.db.interview.update(draft.id, {
        ...payload,
        notified_day_of: false,
        notified_before: false,
      })
    }
    setDraft(null)
    await refresh()
    toast.success('Interview saved.')
  }

  async function setStatus(id: number, status: Interview['status']) {
    if (!window.db) return
    await window.db.interview.update(id, { status })
    await refresh()
  }

  // Drag-to-reschedule. Month keeps the time-of-day (changes the date); Week uses
  // the dropped slot's time. Rescheduling re-arms reminders (clear sent flags).
  async function reschedule(id: number, when: Date, keepTime: boolean) {
    if (!window.db) return
    const iv = items.find((x) => x.id === id)
    if (!iv) return
    const d = new Date(when)
    if (keepTime) {
      const old = new Date(iv.scheduled_at)
      d.setHours(old.getHours(), old.getMinutes(), 0, 0)
    }
    await window.db.interview.update(id, {
      scheduled_at: toLocalInput(d),
      notified_day_of: false,
      notified_before: false,
    })
    await refresh()
  }

  async function confirmDelete() {
    if (deleteId === null || !window.db) return
    await window.db.interview.delete(deleteId)
    setDeleteId(null)
    await refresh()
    toast.success('Interview removed.')
  }

  function Row({ iv, dim }: { iv: Interview; dim?: boolean }) {
    const upcoming = iv.status === 'upcoming'
    return (
      <Card className={cn(dim && 'opacity-60')}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{iv.round_name?.trim() || typeLabel(iv.interview_type)}</Badge>
              <span className="text-sm font-medium tabular-nums text-primary">
                {relativeWhen(iv.scheduled_at, now)}
              </span>
              {iv.status === 'completed' && <Badge variant="secondary">Completed</Badge>}
              {iv.status === 'cancelled' && <Badge variant="secondary">Cancelled</Badge>}
            </div>
            <p className="mt-1 truncate font-medium">
              {iv.company} — {iv.job_title}
            </p>
            <p className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {iv.duration_min} min
              </span>
              {iv.location && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{iv.location}</span>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {upcoming && (
              <Button size="sm" onClick={() => void launchInterviewSession(iv, navigate)}>
                <Radio className="mr-1.5 h-4 w-4" /> Start live session
              </Button>
            )}
            {iv.session_id && (
              <Button
                size="icon"
                variant="ghost"
                title="View report"
                onClick={() => navigate(`/report/${iv.session_id}`)}
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
            {iv.application_id && (
              <Button
                size="icon"
                variant="ghost"
                title="Open job"
                onClick={() => navigate(`/applications/${iv.application_id}`)}
              >
                <Briefcase className="h-4 w-4" />
              </Button>
            )}
            {upcoming && (
              <Button
                size="icon"
                variant="ghost"
                title="Mark complete"
                onClick={() => void setStatus(iv.id, 'completed')}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            {upcoming && (
              <Button
                size="icon"
                variant="ghost"
                title="Cancel interview"
                onClick={() => void setStatus(iv.id, 'cancelled')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(iv)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" title="Delete" onClick={() => setDeleteId(iv.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  function Group({ title, list, dim }: { title: string; list: Interview[]; dim?: boolean }) {
    if (list.length === 0) return null
    return (
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          {title} <span className="text-xs">· {list.length}</span>
        </h2>
        {list.map((iv) => (
          <Row key={iv.id} iv={iv} dim={dim} />
        ))}
      </section>
    )
  }

  const total = items.length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            {(
              [
                ['month', 'Month', CalendarDays],
                ['week', 'Week', CalendarRange],
                ['agenda', 'Agenda', List],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => changeView(v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm transition-colors',
                  view === v
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Schedule interview
          </Button>
        </div>
      </div>

      {view !== 'agenda' && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setViewDate(new Date())}>
            Today
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => step(-1)} title="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => step(1)} title="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm font-medium">
            {view === 'week' ? weekRangeLabel(viewDate) : monthLabel(viewDate)}
          </span>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-[28rem]" />
      ) : view === 'month' ? (
        <MonthView
          viewDate={viewDate}
          items={items}
          now={now}
          onDayClick={(d) => openForDate(d, false)}
          onEventClick={setDetail}
          onMoreClick={setDayList}
          onEventDrop={(id, d) => void reschedule(id, d, true)}
        />
      ) : view === 'week' ? (
        <WeekView
          viewDate={viewDate}
          items={items}
          now={now}
          onSlotClick={(d) => openForDate(d, true)}
          onEventClick={setDetail}
          onEventDrop={(id, slot) => void reschedule(id, slot, false)}
        />
      ) : total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              No interviews scheduled. Add one to get a reminder before it starts and launch a live
              session in one click.
            </p>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Schedule interview
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Group title="Today" list={groups.today} />
          <Group title="This week" list={groups.thisWeek} />
          <Group title="Later" list={groups.later} />
          <Group title="Past" list={groups.past} dim />
        </div>
      )}

      {/* New/Edit dialog */}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id === null ? 'Schedule interview' : 'Edit interview'}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              {apps.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Link to application (optional)</Label>
                  <Select
                    value={draft.application_id !== null ? String(draft.application_id) : 'none'}
                    onValueChange={pickApplication}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {apps.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.company} — {a.job_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Input
                    value={draft.company}
                    onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Job title</Label>
                  <Input
                    value={draft.job_title}
                    onChange={(e) => setDraft({ ...draft, job_title: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date &amp; time</Label>
                  <Input
                    type="datetime-local"
                    value={draft.scheduled_at}
                    onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    step={5}
                    value={draft.duration_min}
                    onChange={(e) =>
                      setDraft({ ...draft, duration_min: Number(e.target.value) || 45 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={draft.interview_type}
                    onValueChange={(v) => setDraft({ ...draft, interview_type: v as InterviewType })}
                  >
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
                  <Label>Round (optional)</Label>
                  <Input
                    placeholder="Phone screen, Onsite…"
                    value={draft.round_name}
                    onChange={(e) => setDraft({ ...draft, round_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Location / meeting link (optional)</Label>
                <Input
                  placeholder="Zoom/Meet URL or room"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Resume for this interview (optional)</Label>
                <Select
                  value={draft.resume_id !== null ? String(draft.resume_id) : 'default'}
                  onValueChange={(v) =>
                    setDraft({ ...draft, resume_id: v === 'default' ? null : Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Use default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use default resume</SelectItem>
                    {resumes.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Job description (optional)</Label>
                <Textarea
                  rows={3}
                  value={draft.job_description}
                  onChange={(e) => setDraft({ ...draft, job_description: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Additional info (optional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Personal context carried into the live session (motivations, situation)…"
                  value={draft.additional_info}
                  onChange={(e) => setDraft({ ...draft, additional_info: e.target.value })}
                />
              </div>

              {/* Reminders */}
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Remind me the morning of</p>
                    <p className="text-xs text-muted-foreground">A nudge at 8:00 AM on the day.</p>
                  </div>
                  <Switch
                    checked={draft.remind_day_of}
                    onCheckedChange={(v) => setDraft({ ...draft, remind_day_of: v })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reminder before it starts</Label>
                  <Select
                    value={String(draft.remind_mins_before)}
                    onValueChange={(v) => setDraft({ ...draft, remind_mins_before: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMIND_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Reminders fire while Aplomb is open (and catch up when you launch it).
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void save()}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove interview?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event detail (clicked from Month/Week) */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {detail.round_name?.trim() || typeLabel(detail.interview_type)}
                  </Badge>
                  <span>
                    {detail.company} — {detail.job_title}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 font-medium text-primary">
                  <Clock className="h-4 w-4" />
                  {relativeWhen(detail.scheduled_at, now)} · {detail.duration_min} min
                </p>
                {detail.location && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="break-all">{detail.location}</span>
                  </p>
                )}
                {detail.status !== 'upcoming' && (
                  <Badge variant="secondary" className="capitalize">
                    {detail.status}
                  </Badge>
                )}
                {detail.notes && <p className="text-muted-foreground">{detail.notes}</p>}
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {detail.status === 'upcoming' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const iv = detail
                      setDetail(null)
                      void launchInterviewSession(iv, navigate)
                    }}
                  >
                    <Radio className="mr-1.5 h-4 w-4" /> Start live session
                  </Button>
                )}
                {detail.session_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/report/${detail.session_id}`)}
                  >
                    <FileText className="mr-1.5 h-4 w-4" /> Report
                  </Button>
                )}
                {detail.application_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/applications/${detail.application_id}`)}
                  >
                    <Briefcase className="mr-1.5 h-4 w-4" /> Job
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const iv = detail
                    setDetail(null)
                    openEdit(iv)
                  }}
                >
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit
                </Button>
                {detail.status === 'upcoming' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void setStatus(detail.id, 'completed')
                      setDetail(null)
                    }}
                  >
                    <Check className="mr-1.5 h-4 w-4" /> Complete
                  </Button>
                )}
                {detail.status === 'upcoming' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void setStatus(detail.id, 'cancelled')
                      setDetail(null)
                    }}
                  >
                    <X className="mr-1.5 h-4 w-4" /> Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const removeId = detail.id
                    setDetail(null)
                    setDeleteId(removeId)
                  }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Day events (from "+N more" in Month view) */}
      <Dialog open={dayList !== null} onOpenChange={(o) => !o && setDayList(null)}>
        <DialogContent className="sm:max-w-md">
          {dayList && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dayList.toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5">
                {eventsForDay(items, dayList).map((iv) => (
                  <button
                    key={iv.id}
                    type="button"
                    onClick={() => {
                      setDayList(null)
                      setDetail(iv)
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:bg-accent/40"
                  >
                    <span className="min-w-0 truncate">
                      <span className="tabular-nums text-primary">
                        {new Date(iv.scheduled_at).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>{' '}
                      {iv.company} — {iv.job_title}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {iv.round_name?.trim() || typeLabel(iv.interview_type)}
                    </Badge>
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const d = dayList
                    setDayList(null)
                    openForDate(d, false)
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add to this day
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
