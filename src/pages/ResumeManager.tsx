import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ResumeUploader, type ParsedResumeResult } from '@/components/setup/ResumeUploader'
import { ResumeCard } from '@/components/setup/ResumeCard'
import { ParsedDataEditor } from '@/components/setup/ParsedDataEditor'
import type { ParsedResumeData, Resume } from '@/types'

export default function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [parsed, setParsed] = useState<ParsedResumeResult | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Resume | null>(null)
  const [editData, setEditData] = useState<ParsedResumeData | null>(null)
  const [editName, setEditName] = useState('')

  function openEdit(id: number) {
    const r = resumes.find((x) => x.id === id)
    if (!r) return
    setEditing(r)
    setEditData(r.parsed_data)
    setEditName(r.name)
  }

  async function saveEdit() {
    if (!editing || !editData || !window.db) return
    await window.db.resume.update(editing.id, { name: editName.trim() || 'My Resume', parsed_data: editData })
    setEditing(null)
    setEditData(null)
    await refresh()
    toast.success('Resume updated.')
  }

  async function refresh() {
    if (!window.db) return
    setResumes(await window.db.resume.list())
  }

  useEffect(() => {
    void refresh()
  }, [])

  function onParsed(result: ParsedResumeResult) {
    setParsed(result)
    setNameDraft(result.fileName?.replace(/\.[^.]+$/, '') ?? 'My Resume')
  }

  async function save() {
    if (!parsed || !window.db) return
    setSaving(true)
    try {
      await window.db.resume.create({
        name: nameDraft.trim() || 'My Resume',
        file_name: parsed.fileName,
        raw_text: parsed.raw_text,
        parsed_data: parsed.parsed_data,
        is_default: resumes.length === 0,
      })
      setParsed(null)
      setNameDraft('')
      await refresh()
      toast.success('Resume saved.')
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  async function setDefault(id: number) {
    if (!window.db) return
    await window.db.resume.setDefault(id)
    await refresh()
  }

  async function confirmDelete() {
    if (deleteId === null || !window.db) return
    await window.db.resume.delete(deleteId)
    setDeleteId(null)
    await refresh()
    toast.success('Resume deleted.')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My Resumes</h1>

      {resumes.length === 0 && !parsed && (
        <p className="text-sm text-muted-foreground">No resumes yet. Add one below.</p>
      )}

      <div className="space-y-2">
        {resumes.map((r) => (
          <ResumeCard
            key={r.id}
            resume={r}
            mode="manage"
            onSetDefault={setDefault}
            onDelete={setDeleteId}
            onEdit={openEdit}
          />
        ))}
      </div>

      {parsed ? (
        <Card className="border-primary/40">
          <CardContent className="space-y-4 py-5">
            <p className="text-sm font-medium">Parsed preview</p>
            <div className="flex flex-wrap gap-1">
              {parsed.parsed_data.skills.slice(0, 10).map((s) => (
                <Badge key={s} variant="secondary" className="font-normal">
                  {s}
                </Badge>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resume_name">Resume name</Label>
              <Input id="resume_name" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void save()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving…' : 'Save resume'}
              </Button>
              <Button variant="ghost" onClick={() => setParsed(null)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ResumeUploader onParsed={onParsed} />
      )}

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete resume?</DialogTitle>
            <DialogDescription>
              This permanently removes the resume. Sessions that used it are not affected.
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

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit resume</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="edit_name">Resume name</Label>
            <Input id="edit_name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          {editData && (
            <ParsedDataEditor value={editData} rawText={editing?.raw_text} onChange={setEditData} />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
