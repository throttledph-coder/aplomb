import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

// "Remember me" routing: when on, the session lives in localStorage (survives
// app restarts); when off, sessionStorage (cleared when the app closes). The
// flag itself is kept in localStorage and read at call time.
const REMEMBER_KEY = 'aplomb_remember'

function activeStore(): Storage {
  return localStorage.getItem(REMEMBER_KEY) === '0' ? sessionStorage : localStorage
}

const hybridStorage = {
  getItem: (k: string) => activeStore().getItem(k),
  setItem: (k: string, v: string) => activeStore().setItem(k, v),
  removeItem: (k: string) => activeStore().removeItem(k),
}

// Call BEFORE signing in so the auth token is written to the chosen store.
export function setRemember(on: boolean): void {
  localStorage.setItem(REMEMBER_KEY, on ? '1' : '0')
}

// Renderer-side Supabase client (auth + subscription reads). RLS protects all
// data so the publishable key is safe to ship.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: hybridStorage,
  },
})
