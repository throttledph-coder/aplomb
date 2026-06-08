import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, CreditCard, Loader2, Trash2, Download, CheckCircle2, RotateCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { buildCheckoutUrl } from '@/lib/billing/config'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useUpdater } from '@/hooks/useUpdater'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProfileFields, EMPTY_PROFILE, type ProfileDraft } from '@/components/profile/ProfileFields'
import { useAppStore } from '@/store/app-store'

const SUPPORT_EMAIL = 'hello@aplomb.app'

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Account() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const plan = useAppStore((s) => s.plan)
  const subscriptionActive = useAppStore((s) => s.subscriptionActive)
  const subscription = useAppStore((s) => s.subscription)
  const profile = useAppStore((s) => s.profile)
  const refreshSubscription = useAppStore((s) => s.refreshSubscription)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const updater = useUpdater()
  const deleteAccount = useAppStore((s) => s.deleteAccount)

  const [refreshing, setRefreshing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_PROFILE)
  const [savingProfile, setSavingProfile] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Seed the editable form from the loaded profile.
  useEffect(() => {
    setDraft({
      full_name: profile?.full_name ?? '',
      preferred_name: profile?.preferred_name ?? '',
      pronouns: profile?.pronouns ?? '',
      birthday: profile?.birthday ?? '',
    })
  }, [profile])

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const r = await updateProfile({
        full_name: draft.full_name.trim() || null,
        preferred_name: draft.preferred_name.trim() || null,
        pronouns: draft.pronouns || null,
        birthday: draft.birthday || null,
      })
      if (r.ok) toast.success('Profile saved.')
      else toast.error(r.error ?? 'Could not save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  if (!user) return null // gate guarantees a user; safety only

  const initial = (user.email?.[0] ?? '?').toUpperCase()
  const isPro = plan === 'premium'
  const statusLabel = subscriptionActive
    ? 'Active'
    : subscription?.status === 'past_due'
      ? 'Past due'
      : 'Free'

  function startCheckout() {
    if (!user) return
    const url = buildCheckoutUrl(user.id, user.email)
    if (!url) {
      toast.info('Checkout is not configured yet.')
      return
    }
    void window.app?.openExternal(url)
    toast.info('Complete the purchase in your browser — your status updates automatically.')
    let ticks = 0
    const timer = setInterval(() => {
      ticks++
      void refreshSubscription()
      if (ticks >= 15 || useAppStore.getState().subscriptionActive) clearInterval(timer)
    }, 3000)
  }

  async function doRefresh() {
    setRefreshing(true)
    try {
      await refreshSubscription()
      toast.success('Subscription status refreshed.')
    } finally {
      setRefreshing(false)
    }
  }

  async function sendReset() {
    if (!user?.email) return
    setResetting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email)
      if (error) toast.error(error.message)
      else toast.success('Password reset email sent.')
    } finally {
      setResetting(false)
    }
  }

  async function doDelete() {
    setDeleting(true)
    try {
      const r = await deleteAccount()
      if (r.ok) {
        toast.success('Your account was deleted.')
        // signOut already ran inside deleteAccount → the auth gate sends us to /login.
      } else {
        toast.error(r.error ?? 'Could not delete account.')
        setConfirmDelete(false)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>

      {/* Profile */}
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{user.email}</p>
              <Badge variant={isPro ? 'default' : 'secondary'}>{isPro ? 'Pro' : 'Free'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Member since {fmtDate(user.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Your details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileFields value={draft} onChange={setDraft} />
          <Button onClick={() => void saveProfile()} disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save profile'}
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium">{statusLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-medium">{isPro ? 'Aplomb Pro' : 'Free'}</p>
            </div>
            {subscriptionActive && (
              <div>
                <p className="text-xs text-muted-foreground">Renews</p>
                <p className="font-medium">{fmtDate(subscription?.current_period_end)}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Pro unlocks the live practice assistant (auto-listen) + focus/stealth mode. All prep
            features are free.
          </p>

          <div className="flex flex-wrap gap-2">
            {!subscriptionActive && <Button onClick={startCheckout}>Upgrade to Pro</Button>}
            {subscriptionActive && (
              <Button variant="outline" onClick={() => toast.info('Billing portal coming soon.')}>
                <CreditCard className="mr-2 h-4 w-4" /> Manage billing
              </Button>
            )}
            <Button variant="outline" onClick={() => void doRefresh()} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Send a password reset link to your email.
          </p>
          <Button variant="outline" onClick={() => void sendReset()} disabled={resetting}>
            {resetting ? 'Sending…' : 'Reset password'}
          </Button>
        </CardContent>
      </Card>

      {/* Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current version</span>
            <span className="font-medium">Aplomb {__APP_VERSION__}</span>
          </div>

          {import.meta.env.DEV ? (
            <p className="text-xs text-muted-foreground">
              Auto-update runs in the installed app, not in development.
            </p>
          ) : (
            <>
              {updater.status === 'downloading' && (
                <div className="space-y-1.5">
                  <Progress value={updater.percent} />
                  <p className="text-xs text-muted-foreground">Downloading update… {updater.percent}%</p>
                </div>
              )}
              {updater.status === 'available' && (
                <p className="text-xs text-muted-foreground">
                  Version {updater.version} is available.
                </p>
              )}
              {updater.status === 'not-available' && (
                <p className="text-xs text-muted-foreground">You're on the latest version.</p>
              )}
              {updater.status === 'error' && (
                <p className="text-xs text-destructive">{updater.error}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {updater.status === 'downloaded' ? (
                  <Button size="sm" onClick={() => void updater.install()}>
                    <RotateCw className="mr-2 h-4 w-4" /> Restart &amp; install
                  </Button>
                ) : updater.status === 'available' ? (
                  <Button size="sm" onClick={() => void updater.download()}>
                    <Download className="mr-2 h-4 w-4" /> Download update
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updater.status === 'checking' || updater.status === 'downloading'}
                    onClick={() => void updater.check()}
                  >
                    {updater.status === 'checking' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : updater.status === 'not-available' ? (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Check for updates
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">Aplomb {__APP_VERSION__}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/legal/terms')}>
              Terms
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/legal/privacy')}>
              Privacy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/legal/refund')}>
              Refund
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void window.app?.openExternal(`mailto:${SUPPORT_EMAIL}`)}
            >
              Contact support
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your resume, job descriptions, and answers stay on this device or go only to your own
            AI provider. We store just your account email, profile, and subscription status.
          </p>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={(o) => !deleting && setConfirmDelete(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your account, profile, and subscription record from our
              servers. Locally stored resumes and sessions are not touched. You can&apos;t undo
              this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void doDelete()} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                'Delete account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
