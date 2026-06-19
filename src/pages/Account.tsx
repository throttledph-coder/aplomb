import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, CreditCard, Loader2, Trash2, Download, Upload } from 'lucide-react'
import { buildCheckoutUrl } from '@/lib/billing/config'
import { supabase } from '@/lib/supabase/client'
import { parseExport } from '@/lib/backup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Account() {
  const user = useAppStore((s) => s.user)
  const plan = useAppStore((s) => s.plan)
  const subscriptionActive = useAppStore((s) => s.subscriptionActive)
  const subscription = useAppStore((s) => s.subscription)
  const profile = useAppStore((s) => s.profile)
  const refreshSubscription = useAppStore((s) => s.refreshSubscription)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const loadSettings = useAppStore((s) => s.loadSettings)
  const deleteAccount = useAppStore((s) => s.deleteAccount)

  const [refreshing, setRefreshing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_PROFILE)
  const [savingProfile, setSavingProfile] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showClear, setShowClear] = useState(false)

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

  // Local data lives on this device; export/import/clear belong with the
  // account's data controls (alongside delete).
  async function exportData() {
    if (!window.db) return
    const resumes = await window.db.resume.list()
    const sessions = await window.db.session.list()
    const qaBySession: Record<number, unknown> = {}
    for (const s of sessions) qaBySession[s.id] = await window.db.qa.list(s.id)
    const payload = {
      exported_at: new Date().toISOString(),
      settings: await window.db.settings.getAll(),
      resumes,
      sessions,
      qa: qaBySession,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aplomb-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported.')
  }

  async function importData(file: File) {
    if (!window.db) return
    let parsed
    try {
      parsed = parseExport(await file.text())
    } catch (err) {
      toast.error(`Import failed: ${(err as Error).message}`)
      return
    }
    const resumeIdMap = new Map<number, number>()
    for (const r of parsed.resumes) {
      const created = await window.db.resume.create({
        name: r.name,
        file_name: r.file_name,
        raw_text: r.raw_text,
        parsed_data: r.parsed_data,
        is_default: r.is_default,
      })
      resumeIdMap.set(r.id, created.id)
    }
    let sessionCount = 0
    for (const s of parsed.sessions) {
      const newResumeId = resumeIdMap.get(s.resume_id)
      if (newResumeId === undefined) continue
      const created = await window.db.session.create({
        resume_id: newResumeId,
        session_name: s.session_name,
        company: s.company,
        job_title: s.job_title,
        interview_type: s.interview_type,
        job_description: s.job_description,
        parsed_jd: s.parsed_jd,
        additional_info: s.additional_info,
      })
      sessionCount++
      for (const qa of parsed.qa[String(s.id)] ?? []) {
        await window.db.qa.create({
          session_id: created.id,
          question: qa.question,
          answer: qa.answer,
          question_source: qa.question_source,
          sequence_order: qa.sequence_order,
        })
      }
    }
    toast.success(`Imported ${resumeIdMap.size} resumes, ${sessionCount} sessions.`)
  }

  async function clearData() {
    if (!window.db) return
    setClearing(true)
    try {
      for (const s of await window.db.session.list()) await window.db.session.delete(s.id)
      for (const r of await window.db.resume.list()) await window.db.resume.delete(r.id)
      await loadSettings()
      toast.success('All resumes and sessions cleared.')
    } finally {
      setClearing(false)
      setShowClear(false)
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

      {/* Privacy & Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy &amp; data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Your resumes and sessions are stored locally on this device. Export a backup, import one,
            or clear everything.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void exportData()}>
              <Download className="mr-2 h-4 w-4" /> Export all data
            </Button>
            <label>
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void importData(f)
                  e.target.value = ''
                }}
              />
              <Button variant="outline" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" /> Import data
                </span>
              </Button>
            </label>
            <Button variant="ghost" onClick={() => setShowClear(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear all data
            </Button>
          </div>
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

      <Dialog open={showClear} onOpenChange={(o) => !clearing && setShowClear(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all data?</DialogTitle>
            <DialogDescription>
              Permanently deletes all resumes and sessions (with their Q&amp;A and reports) from this
              device. Your settings and API key are kept. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowClear(false)} disabled={clearing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void clearData()} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
