import { toast } from 'sonner'
import { startSessionForJob } from '@/lib/sessions/start'
import type { Interview } from '@/types'

// One-click "quick launch" from the calendar: resolve the interview's resume
// (its own, else the default; route to setup if none), then hand off to the
// shared session-start path which links the session to the job + this interview.
export async function launchInterviewSession(
  iv: Interview,
  navigate: (to: string) => void,
): Promise<void> {
  if (!window.db) return

  let resumeId = iv.resume_id ?? null
  if (resumeId === null) {
    const def = await window.db.resume.getDefault()
    resumeId = def?.id ?? null
  }
  if (resumeId === null) {
    toast.error('Add a resume first to launch a live session.')
    navigate('/setup/resume')
    return
  }

  await startSessionForJob(
    {
      resumeId,
      company: iv.company,
      job_title: iv.job_title,
      interview_type: iv.interview_type,
      job_description: iv.job_description ?? '',
      additional_info: iv.additional_info,
      applicationId: iv.application_id,
      interviewId: iv.id,
    },
    navigate,
  )
}
