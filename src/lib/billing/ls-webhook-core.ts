// Pure Lemon Squeezy webhook helpers — shared by the Cloudflare Worker and unit
// tests. Uses Web Crypto (available in Workers + Node 20+), no node:crypto.

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Verify the X-Signature header = HMAC-SHA256(rawBody, secret) as lowercase hex.
export async function verifySignature(
  rawBody: string,
  signatureHex: string,
  secret: string,
): Promise<boolean> {
  if (!signatureHex || !secret) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  return timingSafeEqual(hex(mac), signatureHex.trim().toLowerCase())
}

export type SubStatus = 'active' | 'past_due' | 'canceled' | 'none'

export interface MappedSubscription {
  status: SubStatus
  current_period_end: string | null
}

// Map a Lemon Squeezy subscription status → our internal status + period end.
export function mapLsStatus(attrs: {
  status?: string
  renews_at?: string | null
  ends_at?: string | null
}): MappedSubscription {
  const s = (attrs.status ?? '').toLowerCase()
  let status: SubStatus = 'none'
  if (s === 'active' || s === 'on_trial') status = 'active'
  else if (s === 'past_due') status = 'past_due'
  else if (s === 'cancelled' || s === 'canceled' || s === 'expired' || s === 'unpaid' || s === 'paused')
    status = 'canceled'
  return { status, current_period_end: attrs.renews_at ?? attrs.ends_at ?? null }
}
