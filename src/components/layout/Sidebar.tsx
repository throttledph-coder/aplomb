import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, History, FileText, Settings, Briefcase, CalendarDays, ChevronDown, LogOut, User, Sparkles, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AplombMark } from '@/components/brand/Logo'
import { useAppStore } from '@/store/app-store'

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, end: false },
  { to: '/applications', label: 'Applications', icon: Briefcase, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/resumes', label: 'Resumes', icon: FileText, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

const linkClass = (isActive: boolean) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-accent text-accent-foreground'
      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
  )

function displayName(
  profile: { preferred_name: string | null; full_name: string | null } | null,
  email: string | null,
): string {
  return (
    profile?.preferred_name?.trim() ||
    profile?.full_name?.trim().split(/\s+/)[0] ||
    email?.split('@')[0] ||
    'Account'
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const plan = useAppStore((s) => s.plan)
  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)
  const signOut = useAppStore((s) => s.signOut)
  const activeSession = useAppStore((s) => s.activeSession)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the user menu on outside click.
  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const name = displayName(profile, user?.email ?? null)
  const isPro = plan === 'premium'

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-card px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <AplombMark className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold tracking-tight">Aplomb</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {activeSession && (
          <NavLink
            to={`/session/${activeSession.id}`}
            className={({ isActive }) => linkClass(isActive)}
            title={`Live interview — ${activeSession.company}`}
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-primary/60" />
              <span className="h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="truncate">Live: {activeSession.company}</span>
          </NavLink>
        )}
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => linkClass(isActive)}>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Claude-style user menu */}
      <div className="relative mt-4 border-t pt-3" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-lg border bg-card p-1 shadow-lg">
            {!isPro && (
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/account')
                }}
              >
                <Sparkles className="h-4 w-4 text-primary" /> Upgrade to Pro
              </button>
            )}
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent"
              onClick={() => {
                setMenuOpen(false)
                navigate('/account')
              }}
            >
              <User className="h-4 w-4" /> Account
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent"
              onClick={() => {
                setMenuOpen(false)
                navigate('/help')
              }}
            >
              <HelpCircle className="h-4 w-4" /> Help &amp; About
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent"
              onClick={() => {
                setMenuOpen(false)
                void signOut()
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{name}</span>
            <span className="block text-xs text-muted-foreground">{isPro ? 'Pro' : 'Free plan'}</span>
          </span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', menuOpen && 'rotate-180')}
          />
        </button>
      </div>
    </aside>
  )
}
