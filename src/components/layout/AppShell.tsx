import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'

export function AppShell() {
  const zen = useAppStore((s) => s.zenMode)
  const navigate = useNavigate()

  // Clicking an interview reminder toast focuses the app on the Calendar.
  useEffect(() => {
    if (!window.app?.onInterviewNavigate) return
    return window.app.onInterviewNavigate(() => navigate('/calendar'))
  }, [navigate])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {!zen && <Sidebar />}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className={cn('mx-auto', zen ? 'max-w-none px-4 py-3' : 'max-w-5xl px-8 py-6')}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
