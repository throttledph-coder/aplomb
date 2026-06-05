import { describe, it, expect } from 'vitest'
import { verifySignature, mapLsStatus } from './ls-webhook-core'

async function hmacHex(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

describe('verifySignature', () => {
  it('accepts a correct HMAC signature', async () => {
    const body = '{"hello":"world"}'
    const sig = await hmacHex(body, 'secret123')
    expect(await verifySignature(body, sig, 'secret123')).toBe(true)
  })

  it('rejects a wrong signature / secret', async () => {
    const body = '{"hello":"world"}'
    const sig = await hmacHex(body, 'secret123')
    expect(await verifySignature(body, sig, 'other')).toBe(false)
    expect(await verifySignature(body, 'deadbeef', 'secret123')).toBe(false)
    expect(await verifySignature(body, '', 'secret123')).toBe(false)
  })
})

describe('mapLsStatus', () => {
  it('maps active/trial to active with renews_at', () => {
    expect(mapLsStatus({ status: 'active', renews_at: '2030-01-01T00:00:00Z' })).toEqual({
      status: 'active',
      current_period_end: '2030-01-01T00:00:00Z',
    })
    expect(mapLsStatus({ status: 'on_trial' }).status).toBe('active')
  })

  it('maps past_due and cancellations', () => {
    expect(mapLsStatus({ status: 'past_due' }).status).toBe('past_due')
    expect(mapLsStatus({ status: 'cancelled' }).status).toBe('canceled')
    expect(mapLsStatus({ status: 'expired' }).status).toBe('canceled')
    expect(mapLsStatus({ status: 'unpaid' }).status).toBe('canceled')
  })
})
