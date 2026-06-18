// Cloudflare Worker — Aplomb billing on PayMongo.
//   POST /checkout  → create a hosted Checkout Session (called by the app's main process)
//   POST /          → PayMongo webhook (checkout_session.payment.paid) → grant a 30-day Pro pass
//   GET  /          → health check
//
// Secrets (wrangler secret put): PAYMONGO_SECRET_KEY, PAYMONGO_WEBHOOK_SECRET,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. No key ever lives in the repo or the app.
import { computePassEnd } from '../../../src/lib/billing/pass'

export interface Env {
  PAYMONGO_SECRET_KEY: string
  PAYMONGO_WEBHOOK_SECRET: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

// Pro pass: ₱499 (PayMongo amounts are in centavos).
const PASS_AMOUNT_CENTAVOS = 49900
const PASS_NAME = 'Aplomb Pro — 30 days'
const SITE = 'https://aplomb.throttledph.workers.dev'
const SUCCESS_URL = `${SITE}/payment-success.html`
const CANCEL_URL = `${SITE}/`

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))
}

// Verify the PayMongo-Signature header: "t=<ts>,te=<test_sig>,li=<live_sig>".
// Signed payload is `${t}.${rawBody}`; accept if it matches the live OR test sig.
async function verifyPaymongo(raw: string, header: string, secret: string): Promise<boolean> {
  if (!header || !secret) return false
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const i = p.indexOf('=')
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()]
    }),
  ) as { t?: string; te?: string; li?: string }
  if (!parts.t) return false
  const mac = await hmacHex(secret, `${parts.t}.${raw}`)
  return (
    (!!parts.li && timingSafeEqual(mac, parts.li.toLowerCase())) ||
    (!!parts.te && timingSafeEqual(mac, parts.te.toLowerCase()))
  )
}

async function createCheckout(env: Env, userId: string, email: string | null): Promise<Response> {
  const body = {
    data: {
      attributes: {
        line_items: [
          { currency: 'PHP', amount: PASS_AMOUNT_CENTAVOS, name: PASS_NAME, quantity: 1 },
        ],
        payment_method_types: ['gcash', 'paymaya', 'card', 'qrph'],
        description: 'Aplomb Pro — 30-day pass',
        send_email_receipt: !!email,
        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL,
        metadata: { user_id: userId },
        ...(email ? { customer_email: email } : {}),
      },
    },
  }
  const res = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYMONGO_SECRET_KEY}:`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as { data?: { attributes?: { checkout_url?: string } } }
  const url = json?.data?.attributes?.checkout_url
  if (!res.ok || !url) {
    return new Response(JSON.stringify({ error: 'checkout_failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === 'GET') return new Response('ok') // health check

    // App → create a hosted checkout for this signed-in user.
    if (url.pathname === '/checkout' && req.method === 'POST') {
      let payload: { user_id?: string; email?: string | null }
      try {
        payload = (await req.json()) as typeof payload
      } catch {
        return new Response('bad json', { status: 400 })
      }
      if (!payload.user_id) return new Response('missing user_id', { status: 400 })
      return createCheckout(env, payload.user_id, payload.email ?? null)
    }

    // PayMongo webhook.
    const raw = await req.text()
    const sig = req.headers.get('Paymongo-Signature') ?? ''
    if (!(await verifyPaymongo(raw, sig, env.PAYMONGO_WEBHOOK_SECRET))) {
      return new Response('invalid signature', { status: 401 })
    }

    let event: any
    try {
      event = JSON.parse(raw)
    } catch {
      return new Response('bad json', { status: 400 })
    }

    const type: string = event?.data?.attributes?.type ?? ''
    const resource = event?.data?.attributes?.data ?? {}
    const sessionId = String(resource?.id ?? '')
    const userId: string | undefined = resource?.attributes?.metadata?.user_id

    if (type !== 'checkout_session.payment.paid' || !userId || !sessionId) {
      return new Response('ignored', { status: 200 })
    }

    const base = `${env.SUPABASE_URL}/rest/v1/subscriptions`
    const headers = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    }

    // One pass row per user. Stack onto any remaining time; dedupe webhook
    // retries by the checkout-session id we stored in provider_ref.
    const existingRes = await fetch(
      `${base}?user_id=eq.${userId}&provider=eq.paymongo&select=id,current_period_end,provider_ref`,
      { headers },
    )
    const existing = (await existingRes.json()) as Array<{
      id: number
      current_period_end: string | null
      provider_ref: string | null
    }>
    const current = Array.isArray(existing) ? existing[0] : undefined
    if (current && current.provider_ref === sessionId) {
      return new Response('ok', { status: 200 }) // already processed
    }

    const row = {
      user_id: userId,
      status: 'active',
      plan: 'pro',
      current_period_end: computePassEnd(current?.current_period_end ?? null, new Date()),
      provider: 'paymongo',
      provider_ref: sessionId,
      updated_at: new Date().toISOString(),
    }

    if (current) {
      await fetch(`${base}?id=eq.${current.id}`, {
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
