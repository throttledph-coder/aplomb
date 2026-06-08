import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import type { Interview } from '@/types'

// One-click "quick launch": turn a scheduled interview into a live session,
// reusing the normal session flow but skipping the 2-step setup wizard. Resolves
// the interview's chosen resume (falling back to the default); if none exists,
// routes to the resume setup so the user can add one.
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

  try {
    const session = await window.db.session.create({
      resume_id: resumeId,
      company: iv.company,
      job_title: iv.job_title,
      interview_type: iv.interview_type,
      job_description: iv.job_description ?? '',
    })
    await window.db.interview.update(iv.id, { session_id: session.id, status: 'completed' })
    await useAppStore.getState().refreshActiveSession()
    navigate(`/session/${session.id}`)
  } catch (err) {
    toast.error(`Could not start session: ${(err as Error).message}`)
  }
}
