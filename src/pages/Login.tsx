import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SmokeBackground } from '@/components/ui/smoke-background'
import { AplombMark } from '@/components/brand/Logo'
import { ProfileFields, EMPTY_PROFILE, type ProfileDraft } from '@/components/profile/ProfileFields'
import { useAppStore } from '@/store/app-store'
import { supabase, setRemember } from '@/lib/supabase/client'

const PENDING_PROFILE_KEY = 'aplomb_pending_profile'

export default function Login() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const signIn = useAppStore((s) => s.signIn)
  const signUp = useAppStore((s) => s.signUp)
  const updateProfile = useAppStore((s) => s.updateProfile)

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [profile, setProfile] = useState<ProfileDraft>(EMPTY_PROFILE)
  const [remember, setRememberState] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)

  const isSignup = mode === 'signup'

  // Already signed in → leave the login screen.
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  function profilePatch() {
    return {
      full_name: profile.full_name.trim() || null,
      preferred_name: profile.preferred_name.trim() || null,
      pronouns: profile.pronouns || null,
      birthday: profile.birthday || null,
    }
  }

  async function submit() {
    if (!email.trim() || !password) return

    if (isSignup) {
      if (!profile.full_name.trim()) {
        toast.error('Please enter your full name.')
        return
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters.')
        return
      }
      if (password !== confirm) {
        toast.error('Passwords do not match.')
        return
      }
    }

    setBusy(true)
    try {
      setRemember(remember) // route the session to local/session storage before auth
      if (!isSignup) {
        const r = await signIn(email.trim(), password)
        if (!r.ok) toast.error(r.error ?? 'Sign in failed.')
        else navigate('/', { replace: true })
        return
      }

      const r = await signUp(email.trim(), password)
      if (!r.ok) {
        toast.error(r.error ?? 'Sign up failed.')
      } else if (r.needsConfirmation) {
        // No session yet — stash the profile to apply on first sign-in.
        localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profilePatch()))
        toast.success('Account created — check your email to confirm, then sign in.')
        setMode('signin')
        setPassword('')
        setConfirm('')
      } else {
        await updateProfile(profilePatch())
        navigate('/', { replace: true })
      }
    } finally {
      setBusy(false)
    }
  }

  async function forgotPassword() {
    if (!email.trim()) {
      toast.error('Enter your email first, then tap “Forgot password?”.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (error) toast.error(error.message)
    else toast.success(`Password reset link sent to ${email.trim()}.`)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <SmokeBackground smokeColor="#d97757" />
      <div className="absolute inset-0 bg-background/55" />

      <div
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-border/70 bg-card/80 p-8 shadow-2xl backdrop-blur-xl ${
          isSignup ? 'max-w-lg' : 'max-w-md'
        }`}
      >
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <AplombMark className="h-9 w-9 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {isSignup ? 'Create your Aplomb account' : 'Sign in to Aplomb'}
          </h1>
          <p className="text-sm text-muted-foreground">Walk into every interview with aplomb.</p>
        </div>

        <div className="space-y-3">
          {isSignup && <ProfileFields value={profile} onChange={setProfile} />}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSignup) void submit()
                }}
                placeholder="••••••••"
                className="pr-9"
              />
              <button
                type="button"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isSignup && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
              {confirm.length > 0 && confirm !== password && (
                <p className="text-xs text-destructive">Passwords don't match.</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRememberState(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              Stay signed in
            </label>
            {!isSignup && (
              <button
                type="button"
                onClick={() => void forgotPassword()}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </button>
            )}
          </div>

          <Button className="w-full" onClick={() => void submit()} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSignup ? (
              'Create account'
            ) : (
              'Sign in'
            )}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode(isSignup ? 'signin' : 'signup')}
          >
            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>

          <p className="pt-1 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link to="/legal/terms" className="text-foreground underline underline-offset-2 hover:text-primary">
              Terms
            </Link>{' '}
            and{' '}
            <Link
              to="/legal/privacy"
              className="text-foreground underline underline-offset-2 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
