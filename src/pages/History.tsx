import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, RotateCcw, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { InterviewSession } from '@/types'

const TYPE_FILTERS = ['all', 'technical', 'behavioral', 'mixed', 'system_design', 'other']

function snippet(report: string | null): string {
  if (!report) return 'No report yet'
  const line = report
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .find((l) => l.length > 0)
  return line ? (line.length > 90 ? line.slice(0, 90) + '…' : line) : 'No report yet'
}

export default function History() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!window.db) {
      setLoading(false)
      return
    }
    const list = await window.db.session.list()
    setSessions(list)
    const pairs = await Promise.all(
      list.map(async (s) => [s.id, (await window.db.qa.list(s.id)).length] as const),
    )
    setCounts(Object.fromEntries(pairs))
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sessions.filter((s) => {
      if (type !== 'all' && s.interview_type !== type) return false
      if (!q) return true
      return (
        s.company.toLowerCase().includes(q) || s.job_title.toLowerCase().includes(q)
      )
    })
  }, [sessions, query, type])

  async function confirmDelete() {
    if (deleteId === null || !window.db) return
    await window.db.session.delete(deleteId)
    setDeleteId(null)
    await refresh()
    toast.success('Session deleted.')
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Interview History</h1>

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
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t === 'all' ? 'All Types' : t.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {sessions.length === 0 ? 'No sessions yet.' : 'No sessions match your filters.'}
            </p>
            {sessions.length === 0 && (
              <Button onClick={() => navigate('/setup/resume')}>Start prep</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {s.company} — {s.job_title}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.started_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="capitalize">
                    {s.interview_type.replace('_', ' ')}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.max(1, Math.round(s.duration_sec / 60))} min
                  </span>
                  <span>· {counts[s.id] ?? 0} questions</span>
                </div>
                <p className="text-sm text-muted-foreground">"{snippet(s.coaching_report)}"</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/report/${s.id}`)}>
                    <FileText className="mr-1 h-3 w-3" /> View Report
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
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
                      })
                    }
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Reuse Setup
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete session?</DialogTitle>
            <DialogDescription>
              This permanently removes the session and its questions, answers, and report.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
