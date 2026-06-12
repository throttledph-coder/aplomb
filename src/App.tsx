import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/store/app-store'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import History from '@/pages/History'
import ResumeManager from '@/pages/ResumeManager'
import Settings from '@/pages/Settings'
import Onboarding from '@/pages/Onboarding'
import SetupResume from '@/pages/SetupResume'
import SetupJobDescription from '@/pages/SetupJobDescription'
import LiveSession from '@/pages/LiveSession'
import SessionReport from '@/pages/SessionReport'
import Applications from '@/pages/Applications'
import ApplicationDetail from '@/pages/ApplicationDetail'
import Calendar from '@/pages/Calendar'
import Account from '@/pages/Account'
import Overlay from '@/pages/Overlay'
import Terms from '@/pages/legal/Terms'
import Privacy from '@/pages/legal/Privacy'
import Refund from '@/pages/legal/Refund'

// Gate 1: must be signed in (Supabase) before any app screen.
function RequireAuth() {
  const authReady = useAppStore((s) => s.authReady)
  const user = useAppStore((s) => s.user)
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

// Gate 2: first-run users are redirected to onboarding until complete.
function RequireOnboarding() {
  const loaded = useAppStore((s) => s.loaded)
  const isOnboarded = useAppStore((s) => s.isOnboarded)
  if (!loaded) return null
  if (!isOnboarded) return <Navigate to="/onboarding" replace />
  return <AppShell />
}

export default function App() {
  const loadSettings = useAppStore((s) => s.loadSettings)
  const initAuth = useAppStore((s) => s.initAuth)
  const theme = useAppStore((s) => s.settings.theme)

  useEffect(() => {
    loadSettings()
    void initAuth()
  }, [loadSettings, initAuth])

  useEffect(() => {
    // Default to dark (settings seed theme=dark) until a light preference is set.
    document.documentElement.classList.toggle('dark', (theme ?? 'dark') !== 'light')
  }, [theme])

  return (
    <TooltipProvider delayDuration={300}>
      <HashRouter>
        <Routes>
        <Route path="/login" element={<Login />} />
        {/* Public legal pages — readable before sign-in. */}
        <Route path="/legal/terms" element={<Terms />} />
        <Route path="/legal/privacy" element={<Privacy />} />
        <Route path="/legal/refund" element={<Refund />} />
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<Onboarding />} />
          {/* Focus overlay window (no AppShell chrome — its own toolwindow). */}
          <Route path="/overlay" element={<Overlay />} />
          <Route element={<RequireOnboarding />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/applications/:id" element={<ApplicationDetail />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/resumes" element={<ResumeManager />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/account" element={<Account />} />
            <Route path="/setup/resume" element={<SetupResume />} />
            <Route path="/setup/job" element={<SetupJobDescription />} />
            <Route path="/session/:id" element={<LiveSession />} />
            <Route path="/report/:id" element={<SessionReport />} />
          </Route>
        </Route>
        </Routes>
        <Toaster />
      </HashRouter>
    </TooltipProvider>
  )
}
