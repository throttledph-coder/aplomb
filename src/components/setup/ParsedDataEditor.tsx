import { useState, type ReactNode } from 'react'
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  ParsedResumeData,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
} from '@/types'

interface ParsedDataEditorProps {
  value: ParsedResumeData
  onChange: (next: ParsedResumeData) => void
  /** Raw resume text — enables the "Auto-fill with AI" button. */
  rawText?: string
}

const csv = (arr: string[]) => arr.join(', ')
const fromCsv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

export function ParsedDataEditor({ value, onChange, rawText }: ParsedDataEditorProps) {
  const patch = (p: Partial<ParsedResumeData>) => onChange({ ...value, ...p })
  const [aiBusy, setAiBusy] = useState(false)

  async function autoFill() {
    if (!rawText || !window.ai) return
    setAiBusy(true)
    try {
      const structured = await window.ai.structureResume(rawText)
      const empty =
        structured.skills.length === 0 &&
        structured.experience.length === 0 &&
        structured.education.length === 0
      if (empty) {
        toast.error('AI could not structure this resume. Check your provider in Settings.')
        return
      }
      onChange(structured)
      toast.success('Auto-filled from your resume.')
    } catch (err) {
      toast.error(`Auto-fill failed: ${(err as Error).message}`)
    } finally {
      setAiBusy(false)
    }
  }

  function updateExp(i: number, p: Partial<ResumeExperience>) {
    const experience = value.experience.map((e, idx) => (idx === i ? { ...e, ...p } : e))
    patch({ experience })
  }
  function updateEdu(i: number, p: Partial<ResumeEducation>) {
    const education = value.education.map((e, idx) => (idx === i ? { ...e, ...p } : e))
    patch({ education })
  }
  function updateProj(i: number, p: Partial<ResumeProject>) {
    const projects = value.projects.map((e, idx) => (idx === i ? { ...e, ...p } : e))
    patch({ projects })
  }

  return (
    <div className="space-y-4">
      {rawText && (
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            Parsed fields look off? Let AI re-structure your resume.
          </span>
          <Button size="sm" variant="outline" disabled={aiBusy} onClick={() => void autoFill()}>
            {aiBusy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Auto-fill with AI
          </Button>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Summary</Label>
        <Textarea
          rows={2}
          value={value.summary}
          onChange={(e) => patch({ summary: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Skills (comma-separated)</Label>
        <Input value={csv(value.skills)} onChange={(e) => patch({ skills: fromCsv(e.target.value) })} />
      </div>

      <Section
        label="Experience"
        onAdd={() =>
          patch({ experience: [...value.experience, { title: '', company: '', duration: '', bullets: [] }] })
        }
      >
        {value.experience.map((exp, i) => (
          <Row key={i} onRemove={() => patch({ experience: value.experience.filter((_, x) => x !== i) })}>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Title" value={exp.title} onChange={(e) => updateExp(i, { title: e.target.value })} />
              <Input placeholder="Company" value={exp.company} onChange={(e) => updateExp(i, { company: e.target.value })} />
              <Input placeholder="Duration" value={exp.duration} onChange={(e) => updateExp(i, { duration: e.target.value })} />
            </div>
            <Textarea
              rows={2}
              placeholder="Bullets (one per line)"
              value={exp.bullets.join('\n')}
              onChange={(e) => updateExp(i, { bullets: e.target.value.split('\n').filter(Boolean) })}
            />
          </Row>
        ))}
      </Section>

      <Section
        label="Education"
        onAdd={() => patch({ education: [...value.education, { degree: '', school: '', year: '' }] })}
      >
        {value.education.map((ed, i) => (
          <Row key={i} onRemove={() => patch({ education: value.education.filter((_, x) => x !== i) })}>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Degree" value={ed.degree} onChange={(e) => updateEdu(i, { degree: e.target.value })} />
              <Input placeholder="School" value={ed.school} onChange={(e) => updateEdu(i, { school: e.target.value })} />
              <Input placeholder="Year" value={ed.year} onChange={(e) => updateEdu(i, { year: e.target.value })} />
            </div>
          </Row>
        ))}
      </Section>

      <Section
        label="Projects"
        onAdd={() =>
          patch({ projects: [...value.projects, { name: '', description: '', technologies: [] }] })
        }
      >
        {value.projects.map((pr, i) => (
          <Row key={i} onRemove={() => patch({ projects: value.projects.filter((_, x) => x !== i) })}>
            <Input placeholder="Name" value={pr.name} onChange={(e) => updateProj(i, { name: e.target.value })} />
            <Input placeholder="Description" value={pr.description} onChange={(e) => updateProj(i, { description: e.target.value })} />
            <Input
              placeholder="Technologies (comma-separated)"
              value={csv(pr.technologies)}
              onChange={(e) => updateProj(i, { technologies: fromCsv(e.target.value) })}
            />
          </Row>
        ))}
      </Section>
    </div>
  )
}

function Section({
  label,
  onAdd,
  children,
}: {
  label: string
  onAdd: () => void
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button size="sm" variant="ghost" onClick={onAdd}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      {children}
    </div>
  )
}

function Row({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border p-2">
      <div className="flex-1 space-y-2">{children}</div>
      <Button size="icon" variant="ghost" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
