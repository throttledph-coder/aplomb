// Cloudflare Worker — Lemon Squeezy webhook → Supabase `subscriptions`.
// Deploy: `wrangler deploy` (see README). Set the LS webhook URL to this Worker.
// Env (wrangler secret put): LS_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

export interface Env {
  LS_WEBHOOK_SECRET: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifySignature(raw: string, sigHex: string, secret: string): Promise<boolean> {
  if (!sigHex || !secret) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))
  return timingSafeEqual(hex(mac), sigHex.trim().toLowerCase())
}

function mapStatus(status: string): 'active' | 'past_due' | 'canceled' | 'none' {
  const s = (status ?? '').toLowerCase()
  if (s === 'active' || s === 'on_trial') return 'active'
  if (s === 'past_due') return 'past_due'
  if (['cancelled', 'canceled', 'expired', 'unpaid', 'paused'].includes(s)) return 'canceled'
  return 'none'
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'POST') return new Response('ok') // health check
    const raw = await req.text()
    const sig = req.headers.get('X-Signature') ?? ''
    if (!(await verifySignature(raw, sig, env.LS_WEBHOOK_SECRET))) {
      return new Response('invalid signature', { status: 401 })
    }

    let payload: any
    try {
      payload = JSON.parse(raw)
    } catch {
      return new Response('bad json', { status: 400 })
    }

    const event: string = payload?.meta?.event_name ?? ''
    const userId: string | undefined = payload?.meta?.custom_data?.user_id
    const subId = String(payload?.data?.id ?? '')
    const attrs = payload?.data?.attributes ?? {}

    // Only act on subscription lifecycle events with our custom user_id.
    if (!event.startsWith('subscription_') || !userId || !subId) {
      return new Response('ignored', { status: 200 })
    }

    const status = mapStatus(attrs.status)
    const current_period_end: string | null = attrs.renews_at ?? attrs.ends_at ?? null

    const base = `${env.SUPABASE_URL}/rest/v1/subscriptions`
    const headers = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    }
    const row = {
      user_id: userId,
      status,
      plan: 'pro',
      current_period_end,
      provider: 'lemon squeezy',
      provider_ref: subId,
      updated_at: new Date().toISOString(),
    }

    // Upsert: update existing row for this LS subscription, else insert.
    const existing = await fetch(`${base}?provider_ref=eq.${subId}&select=id`, { headers })
    const rows = (await existing.json()) as unknown[]
    if (Array.isArray(rows) && rows.length > 0) {
      await fetch(`${base}?provider_ref=eq.${subId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(row),
      })
    } else {
      await fetch(base, { method: 'POST', headers, body: JSON.stringify(row) })
    }

    return new Response('ok', { status: 200 })
  },
}
