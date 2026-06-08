import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import type { InterviewType } from '@/types'

export interface StartSessionInput {
  resumeId: number
  company: string
  job_title: string
  interview_type: InterviewType
  job_description: string
  additional_info?: string | null
  /** Use this application instead of find-or-create (e.g. launched from a job/interview). */
  applicationId?: number | null
  /** When set, link this calendar interview to the new session + mark it completed. */
  interviewId?: number | null
}

// Single entry point for spinning up a live/practice session. Ensures the job
// exists in the tracker (find-or-create), links the session to it, optionally
// links the originating calendar interview, then navigates to the live session.
// Returns the new session id, or null on failure (a toast is shown).
export async function startSessionForJob(
  input: StartSessionInput,
  navigate: (to: string) => void,
): Promise<number | null> {
  if (!window.db) return null
  try {
    let applicationId = input.applicationId ?? null
    if (applicationId === null) {
      const app = await window.db.application.upsertForJob({
        company: input.company,
        job_title: input.job_title,
        job_description: input.job_description || null,
      })
      applicationId = app.id
    }

    const session = await window.db.session.create({
      resume_id: input.resumeId,
      application_id: applicationId,
      company: input.company,
      job_title: input.job_title,
      interview_type: input.interview_type,
      job_description: input.job_description,
      additional_info: input.additional_info ?? null,
    })

    if (input.interviewId != null) {
      await window.db.interview.update(input.interviewId, {
        session_id: session.id,
        status: 'completed',
      })
    }

    const store = useAppStore.getState()
    await store.incrementSession()
    await store.refreshActiveSession()
    navigate(`/session/${session.id}`)
    return session.id
  } catch (err) {
    toast.error(`Could not start session: ${(err as Error).message}`)
    return null
  }
}
