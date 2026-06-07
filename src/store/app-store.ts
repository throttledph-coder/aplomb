import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

export interface ActiveSession {
  id: number
  company: string
  job_title: string
}

export interface AuthUser {
  id: string
  email: string | null
  created_at?: string
}

export interface SubscriptionInfo {
  status: string
  current_period_end: string | null
}

export interface ProfileInfo {
  full_name: string | null
  preferred_name: string | null
  pronouns: string | null
  birthday: string | null
}

export interface AuthResult {
  ok: boolean
  error?: string
  needsConfirmation?: boolean
}

interface AppState {
  settings: Record<string, string | null>
  plan: string
  isOnboarded: boolean
  loaded: boolean
  activeSession: ActiveSession | null
  user: AuthUser | null
  subscriptionActive: boolean
  subscription: SubscriptionInfo | null
  profile: ProfileInfo | null
  authReady: boolean
  zenMode: boolean // live-session reading mode: hide sidebar, full-bleed (transient)
  setZenMode: (v: boolean) => void
  loadProfile: () => Promise<void>
  updateProfile: (patch: Partial<ProfileInfo>) => Promise<{ ok: boolean; error?: string }>
  loadSettings: () => Promise<void>
  updateSetting: (key: string, value: string | null) => Promise<void>
  incrementSession: () => Promise<void>
  refreshActiveSession: () => Promise<void>
  initAuth: () => Promise<void>
  refreshSubscription: () => Promise<void>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>
}

function deriveOnboarded(settings: Record<string, string | null>): boolean {
  return settings.onboarding_complete === 'true'
}

export const useAppStore = create<AppState>((set, get) => {
  // Premium if a cloud subscription is active, or a local unlock is present
  // (offline license / dev toggle both set settings.plan = 'premium').
  function recomputePlan() {
    const { subscriptionActive, settings } = get()
    set({ plan: subscriptionActive || settings.plan === 'premium' ? 'premium' : 'free' })
  }

  // Apply a profile captured at sign-up once the user is actually authenticated
  // (covers the email-confirmation path where there was no session at sign-up).
  async function applyPendingProfile() {
    if (typeof localStorage === 'undefined' || !get().user) return
    const raw = localStorage.getItem('aplomb_pending_profile')
    if (!raw) return
    try {
      await get().updateProfile(JSON.parse(raw))
    } catch {
      /* ignore malformed pending profile */
    } finally {
      localStorage.removeItem('aplomb_pending_profile')
    }
  }

  return {
    settings: {},
    plan: 'free',
    zenMode: false,
    setZenMode: (v: boolean) => set({ zenMode: v }),
    isOnboarded: false,
    loaded: false,
    activeSession: null,
    user: null,
    subscriptionActive: false,
    subscription: null,
    profile: null,
    authReady: false,

    loadSettings: async () => {
      // window.db only exists inside Electron (exposed by preload).
      if (typeof window === 'undefined' || !window.db) {
        set({ loaded: true })
        return
      }
      const settings = await window.db.settings.getAll()
      set({ settings, isOnboarded: deriveOnboarded(settings), loaded: true })
      // Re-verify any stored Pro license (self-heals expired/rotated keys to free).
      if (window.license) {
        const lic = await window.license.status()
        if (lic.valid) set({ settings: { ...get().settings, plan: 'premium' } })
        else if (settings.license_key) set({ settings: { ...get().settings, plan: 'free' } })
      }
      recomputePlan()
      await get().refreshActiveSession()
    },

    refreshActiveSession: async () => {
      if (typeof window === 'undefined' || !window.db) return
      const sessions = await window.db.session.list() // newest-first
      const active = sessions.find((s) => s.status === 'active')
      set({
        activeSession: active
          ? { id: active.id, company: active.company, job_title: active.job_title }
          : null,
      })
    },

    updateSetting: async (key, value) => {
      if (window.db) await window.db.settings.set(key, value)
      const settings = { ...get().settings, [key]: value }
      set({ settings, isOnboarded: deriveOnboarded(settings) })
      recomputePlan()
    },

    incrementSession: async () => {
      if (!window.db) return
      const next = await window.db.settings.incrementFreeSessionsUsed()
      set({ settings: { ...get().settings, free_sessions_used: String(next) } })
    },

    initAuth: async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const u = data.session?.user
        set({
          user: u ? { id: u.id, email: u.email ?? null, created_at: u.created_at } : null,
        })
        await get().refreshSubscription()
        await get().loadProfile()
        await applyPendingProfile()
      } catch {
        // Network/config failure → treat as signed-out (gate shows Login).
        set({ user: null })
      } finally {
        set({ authReady: true })
      }
      supabase.auth.onAuthStateChange((_event, session) => {
        const su = session?.user
        set({
          user: su ? { id: su.id, email: su.email ?? null, created_at: su.created_at } : null,
        })
        void get().refreshSubscription()
        void (async () => {
          await get().loadProfile()
          await applyPendingProfile()
        })()
      })
    },

    loadProfile: async () => {
      const { user } = get()
      if (!user) {
        set({ profile: null })
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('full_name,preferred_name,pronouns,birthday')
        .eq('id', user.id)
        .maybeSingle()
      set({
        profile: data
          ? {
              full_name: data.full_name ?? null,
              preferred_name: data.preferred_name ?? null,
              pronouns: data.pronouns ?? null,
              birthday: data.birthday ?? null,
            }
          : { full_name: null, preferred_name: null, pronouns: null, birthday: null },
      })
    },

    updateProfile: async (patch) => {
      const { user, profile } = get()
      if (!user) return { ok: false, error: 'Not signed in.' }
      const next = { ...(profile ?? {}), ...patch }
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email, ...next }, { onConflict: 'id' })
      if (error) return { ok: false, error: error.message }
      set({
        profile: {
          full_name: next.full_name ?? null,
          preferred_name: next.preferred_name ?? null,
          pronouns: next.pronouns ?? null,
          birthday: next.birthday ?? null,
        },
      })
      return { ok: true }
    },

    refreshSubscription: async () => {
      const { user } = get()
      if (!user) {
        set({ subscriptionActive: false, subscription: null })
        recomputePlan()
        return
      }
      const { data } = await supabase
        .from('subscriptions')
        .select('status,current_period_end')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
      const row = (data ?? [])[0] ?? null
      const nowIso = new Date().toISOString()
      const active =
        !!row && row.status === 'active' && (!row.current_period_end || row.current_period_end > nowIso)
      set({ subscription: row, subscriptionActive: active })
      recomputePlan()
    },

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { ok: false, error: error.message }
      await get().refreshSubscription()
      return { ok: true }
    },

    signUp: async (email, password) => {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) return { ok: false, error: error.message }
      // If confirmation is required, there's no active session yet.
      const needsConfirmation = !data.session
      if (!needsConfirmation) await get().refreshSubscription()
      return { ok: true, needsConfirmation }
    },

    signOut: async () => {
      await supabase.auth.signOut()
      set({ user: null, subscriptionActive: false, subscription: null, profile: null })
      recomputePlan()
    },

    deleteAccount: async () => {
      const { user } = get()
      if (!user) return { ok: false, error: 'Not signed in.' }
      // SECURITY DEFINER RPC deletes only auth.uid()'s own row; FK cascade
      // removes the matching profiles + subscriptions rows.
      const { error } = await supabase.rpc('delete_account')
      if (error) return { ok: false, error: error.message }
      await get().signOut()
      return { ok: true }
    },
  }
})
