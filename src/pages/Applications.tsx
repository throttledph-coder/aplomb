import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Pencil, ExternalLink, Sparkles, FileText, Loader2, Copy, Search, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Markdown } from '@/components/report/Markdown'
import { cn } from '@/lib/utils'
import {
  APPLICATION_STATUSES as STATUSES,
  APPLICATION_STATUS_COLORS as STATUS_COLORS,
} from '@/lib/applications/status'
import type { Application, ApplicationStatus, Resume } from '@/types'

interface DraftState {
  id: number | null
  company: string
  job_title: string
  job_url: string
  status: ApplicationStatus
  job_description: string
  notes: string
}

const EMPTY_DRAFT: DraftState = {
  id: null,
  company: '',
  job_title: '',
  job_url: '',
  status: 'wishlist',
  job_description: '',
  notes: '',
}

export default function Applications() {
  const navigate = useNavigate()
  const [apps, setApps] = useState<Application[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [aiBusy, setAiBusy] = useState<'fit' | 'cover' | null>(null)
  const [aiOutput, setAiOutput] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all')

  async function refresh() {
    if (!window.db) {
      setLoading(false)
      return
    }
    setApps(await window.db.application.list())
    const rs = await window.db.resume.list()
    setResumes(rs)
    if (resumeId === null) setResumeId((rs.find((r) => r.is_default) ?? rs[0])?.id ?? null)
    setLoading(false)
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = apps.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (!q) return true
      return a.company.toLowerCase().includes(q) || a.job_title.toLowerCase().includes(q)
    })
    return STATUSES.map((s) => ({ status: s, items: filtered.filter((a) => a.status === s.value) })).filter(
      (g) => g.items.length > 0,
    )
  }, [apps, query, statusFilter])
  const filteredCount = groups.reduce((n, g) => n + g.items.length, 0)

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openNew() {
    setDraft({ ...EMPTY_DRAFT })
    setAiOutput('')
  }
  function openEdit(a: Application) {
    setDraft({
      id: a.id,
      company: a.company,
      job_title: a.job_title,
      job_url: a.job_url ?? '',
      status: a.status,
      job_description: a.job_description ?? '',
      notes: a.notes ?? '',
    })
    setAiOutput('')
  }

  async function save() {
    if (!draft || !window.db) return
    if (!draft.company.trim() || !draft.job_title.trim()) {
      toast.error('Company and job title are required.')
      return
    }
    const payload = {
      company: draft.company.trim(),
      job_title: draft.job_title.trim(),
      job_url: draft.job_url.trim() || null,
      status: draft.status,
      job_description: draft.job_description.trim() || null,
      notes: draft.notes.trim() || null,
      applied_at:
        draft.status !== 'wishlist' ? new Date().toISOString() : null,
    }
    if (draft.id === null) await window.db.application.create(payload)
    else await window.db.application.update(draft.id, payload)
    setDraft(null)
    await refresh()
    toast.success('Application saved.')
  }

  async function runAi(kind: 'fit' | 'cover') {
    if (!draft || !window.ai) return
    const resume = resumes.find((r) => r.id === resumeId)
    if (!resume) {
      toast.error('Select a resume first (add one in Resumes).')
      return
    }
    if (!draft.job_description.trim()) {
      toast.error('Paste the job description first.')
      return
    }
    setAiBusy(kind)
    setAiOutput('')
    try {
      const input = {
        resume: resume.parsed_data,
        company: draft.company || 'the company',
        jobTitle: draft.job_title || 'the role',
        jobDescription: draft.job_description,
      }
      const out =
        kind === 'fit' ? await window.ai.analyzeFit(input) : await window.ai.draftCoverLetter(input)
      setAiOutput(out)
    } catch (err) {
      toast.error(`AI failed: ${(err as Error).message}. Check your provider in Settings.`)
    } finally {
      setAiBusy(null)
    }
  }

  async function confirmDelete() {
    if (deleteId === null || !window.db) return
    await window.db.application.delete(deleteId)
    setDeleteId(null)
    await refresh()
    toast.success('Application removed.')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> New application
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[3.75rem]" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              No applications tracked yet. Add one to track status, analyze fit, and draft cover letters.
            </p>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> New application
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Search + status filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search company or role…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'all' | ApplicationStatus)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredCount === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No applications match your filters.
              </CardContent>
            </Card>
          ) : (
            groups.map((g) => (
              <section key={g.status.value} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Badge variant="outline" className={cn(STATUS_COLORS[g.status.value])}>
                    {g.status.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{g.items.length}</span>
                </div>
                {g.items.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/applications/${a.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/applications/${a.id}`)
                          }
                        }}
                        className="min-w-0 cursor-pointer rounded-md p-1 -m-1 transition-colors hover:bg-accent/40"
                      >
                        <p className="truncate font-medium">
                          {a.company} — {a.job_title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(a.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={a.status}
                          onValueChange={(v) =>
                            void window.db.application
                              .update(a.id, { status: v as ApplicationStatus })
                              .then(refresh)
                          }
                        >
                          <SelectTrigger className="h-8 w-32">
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
                        {a.job_url && (
                          <Button size="icon" variant="ghost" asChild>
                            <a href={a.job_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </section>
            ))
          )}
        </div>
      )}

      {/* New/Edit + Assistant dialog */}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id === null ? 'New application' : 'Edit application'}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Job title</Label>
                  <Input value={draft.job_title} onChange={(e) => setDraft({ ...draft, job_title: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Job URL</Label>
                  <Input value={draft.job_url} onChange={(e) => setDraft({ ...draft, job_url: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as ApplicationStatus })}>
                    <SelectTrigger>
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
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Job description</Label>
                <Textarea
                  rows={4}
                  value={draft.job_description}
                  onChange={(e) => setDraft({ ...draft, job_description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </div>

              {/* AI assistant */}
              <div className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">AI Assistant</span>
                  <span className="text-xs text-muted-foreground">Resume:</span>
                  <Select
                    value={resumeId !== null ? String(resumeId) : ''}
                    onValueChange={(v) => setResumeId(Number(v))}
                  >
                    <SelectTrigger className="h-7 w-40">
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
                    {aiBusy === 'fit' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                    Analyze fit
                  </Button>
                  <Button size="sm" variant="outline" disabled={aiBusy !== null} onClick={() => void runAi('cover')}>
                    {aiBusy === 'cover' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1 h-3.5 w-3.5" />}
                    Draft cover letter
                  </Button>
                </div>
                {aiOutput && (
                  <div className="mt-3 space-y-2 border-t pt-3">
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
            <DialogTitle>Remove application?</DialogTitle>
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
    </div>
  )
}
