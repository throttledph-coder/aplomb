import { useEffect, useState } from 'react'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

// Subscribes to main-process updater events and exposes actions. Drives the
// Account "Updates" card. Auto-update is a no-op in dev (see import.meta.env.DEV).
export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [version, setVersion] = useState<string | null>(null)
  const [percent, setPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.updater?.onEvent) return
    return window.updater.onEvent((e) => {
      switch (e.type) {
        case 'checking':
          setStatus('checking')
          setError(null)
          break
        case 'available':
          setStatus('available')
          setVersion(e.payload?.version ?? null)
          break
        case 'not-available':
          setStatus('not-available')
          break
        case 'progress':
          setStatus('downloading')
          setPercent(e.payload?.percent ?? 0)
          break
        case 'downloaded':
          setStatus('downloaded')
          setVersion(e.payload?.version ?? null)
          break
        case 'error':
          setStatus('error')
          setError(e.payload?.message ?? 'Update error')
          break
      }
    })
  }, [])

  return {
    status,
    version,
    percent,
    error,
    check: () => window.updater?.check(),
    download: () => window.updater?.download(),
    install: () => window.updater?.install(),
  }
}
