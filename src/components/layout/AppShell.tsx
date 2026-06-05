import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
