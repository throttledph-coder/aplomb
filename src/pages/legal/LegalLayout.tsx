import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AplombMark } from '@/components/brand/Logo'

const LEGAL = [
  { to: '/legal/terms', label: 'Terms' },
  { to: '/legal/privacy', label: 'Privacy' },
  { to: '/legal/refund', label: 'Refund policy' },
]

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <AplombMark className="h-5 w-5 text-primary" /> Aplomb
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="mt-8">{children}</div>

        <nav className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
          {LEGAL.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-8 text-lg font-semibold">{children}</h2>
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-foreground/90">{children}</p>
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5 text-[15px] leading-relaxed text-foreground/90">
      {children}
    </ul>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
      {children}
    </p>
  )
}

// mailto must go through the main process — the renderer's navigation guard
// blocks non-http(s)/file links, so a bare <a href="mailto:"> would no-op.
export function Mail() {
  return (
    <button
      type="button"
      className="text-primary hover:underline"
      onClick={() => void window.app?.openExternal('mailto:hello@aplomb.app')}
    >
      hello@aplomb.app
    </button>
  )
}
