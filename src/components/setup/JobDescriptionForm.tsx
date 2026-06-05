import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { InterviewType } from '@/types'

export interface JobDescriptionValues {
  company: string
  job_title: string
  interview_type: InterviewType
  job_description: string
  additional_info: string
}

interface JobDescriptionFormProps {
  submitting?: boolean
  initialValues?: Partial<JobDescriptionValues>
  onSubmit: (values: JobDescriptionValues) => void
}

const TYPES: { value: InterviewType; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'system_design', label: 'System Design' },
  { value: 'other', label: 'Other' },
]

export function JobDescriptionForm({
  submitting,
  initialValues,
  onSubmit,
}: JobDescriptionFormProps) {
  const [company, setCompany] = useState(initialValues?.company ?? '')
  const [jobTitle, setJobTitle] = useState(initialValues?.job_title ?? '')
  const [type, setType] = useState<InterviewType>(initialValues?.interview_type ?? 'mixed')
  const [jd, setJd] = useState(initialValues?.job_description ?? '')
  const [additionalInfo, setAdditionalInfo] = useState(initialValues?.additional_info ?? '')

  const valid = company.trim() && jobTitle.trim() && jd.trim()

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSubmit({
          company: company.trim(),
          job_title: jobTitle.trim(),
          interview_type: type,
          job_description: jd.trim(),
          additional_info: additionalInfo.trim(),
        })
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="job_title">Job Title</Label>
          <Input
            id="job_title"
            placeholder="Senior Engineer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company">Company Name</Label>
          <Input
            id="company"
            placeholder="Google"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Interview Type</Label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                type === t.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-accent',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jd">Full Job Description</Label>
        <Textarea
          id="jd"
          rows={8}
          placeholder="Paste the complete job description here…"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="additional_info">
          Additional Info <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="additional_info"
          rows={4}
          placeholder="Life events, hobbies, motivations — anything you want to share to make answers more personal. Optional."
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Used as extra context so suggested answers sound more natural and personal.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!valid || submitting}>
          {submitting ? 'Starting…' : 'Start Interview Session →'}
        </Button>
      </div>
    </form>
  )
}
