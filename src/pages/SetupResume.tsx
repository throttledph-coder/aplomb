import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResumeUploader, type ParsedResumeResult } from '@/components/setup/ResumeUploader'
import { ResumeCard } from '@/components/setup/ResumeCard'
import { ParsedDataEditor } from '@/components/setup/ParsedDataEditor'
import type { Resume } from '@/types'

export default function SetupResume() {
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [parsed, setParsed] = useState<ParsedResumeResult | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [saving, setSaving] = useState(false)

  async function refresh() {
    if (!window.db) return
    const list = await window.db.resume.list()
    setResumes(list)
    const def = list.find((r) => r.is_default) ?? list[0]
    if (def && selectedId === null) setSelectedId(def.id)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onParsed(result: ParsedResumeResult) {
    setParsed(result)
    const base = result.fileName?.replace(/\.[^.]+$/, '') ?? 'My Resume'
    setNameDraft(base)
  }

  async function save() {
    if (!parsed || !window.db) return
    setSaving(true)
    try {
      const created = await window.db.resume.create({
        name: nameDraft.trim() || 'My Resume',
        file_name: parsed.fileName,
        raw_text: parsed.raw_text,
        parsed_data: parsed.parsed_data,
        is_default: resumes.length === 0,
      })
      setParsed(null)
      setNameDraft('')
      setSelectedId(created.id)
      await refresh()
      toast.success('Resume saved.')
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Interview Setup</h1>
          <p className="text-sm text-muted-foreground">Step 1 of 2 — Choose your resume</p>
        </div>
      </div>

      {resumes.length > 0 && (
        <div className="space-y-2">
          {resumes.map((r) => (
            <ResumeCard
              key={r.id}
              resume={r}
              mode="select"
              selected={selectedId === r.id}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      )}

      {parsed ? (
        <Card className="border-primary/40">
          <CardContent className="space-y-4 py-5">
            <p className="text-sm font-medium">Review &amp; edit parsed data</p>
            <div className="space-y-1.5">
              <Label htmlFor="resume_name">Resume name</Label>
              <Input
                id="resume_name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
              />
            </div>
            <ParsedDataEditor
              value={parsed.parsed_data}
              rawText={parsed.raw_text}
              onChange={(parsed_data) => setParsed({ ...parsed, parsed_data })}
            />
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

      <div className="flex justify-end">
        <Button
          disabled={selectedId === null}
          onClick={() => navigate('/setup/job', { state: { resumeId: selectedId } })}
        >
          Next: Job Description
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
