import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  JobDescriptionForm,
  type JobDescriptionValues,
} from '@/components/setup/JobDescriptionForm'
import { startSessionForJob } from '@/lib/sessions/start'

const STEPS = [
  'Analyzing job description…',
  'Matching your resume to the role…',
  'Preparing your interview assistant…',
]

export default function SetupJobDescription() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as
    | { resumeId?: number; prefill?: Partial<JobDescriptionValues> }
    | null
  const resumeId = state?.resumeId ?? null
  const prefill = state?.prefill

  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0)

  // Guard: no resume selected -> back to step 1.
  useEffect(() => {
    if (resumeId === null) navigate('/setup/resume', { replace: true })
  }, [resumeId, navigate])

  async function onSubmit(values: JobDescriptionValues) {
    if (resumeId === null || !window.db) return
    setSubmitting(true)
    // Cosmetic pre-analysis progress (docs/08).
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i + 1)
      await new Promise((r) => setTimeout(r, 450))
    }
    // Shared path: find-or-create the application, link the session, navigate.
    const id = await startSessionForJob({ resumeId, ...values }, navigate)
    if (id === null) {
      setSubmitting(false)
      setStep(0)
    }
  }

  if (resumeId === null) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/setup/resume')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Interview Setup</h1>
          <p className="text-sm text-muted-foreground">Step 2 of 2 — Tell us about the role</p>
        </div>
      </div>

      {submitting && step > 0 ? (
        <div className="space-y-3 py-8">
          <Progress value={(step / STEPS.length) * 100} />
          <p className="text-center text-sm text-muted-foreground">{STEPS[step - 1]}</p>
        </div>
      ) : (
        <JobDescriptionForm submitting={submitting} initialValues={prefill} onSubmit={onSubmit} />
      )}
    </div>
  )
}
