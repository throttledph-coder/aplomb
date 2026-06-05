import { describe, it, expect } from 'vitest'
import { generateKeyPairSync, sign as edSign } from 'node:crypto'
import { verifyLicenseWith } from './license'

function makeKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return {
    pub: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    priv: privateKey,
  }
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function issue(priv: Parameters<typeof edSign>[2], payload: object): string {
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)))
  const sig = b64url(edSign(null, Buffer.from(payloadB64), priv))
  return `aplomb-pro.${payloadB64}.${sig}`
}

describe('verifyLicenseWith', () => {
  it('accepts a valid signed license', () => {
    const { pub, priv } = makeKeypair()
    const key = issue(priv, { email: 'a@b.com', plan: 'premium', iat: 1700000000 })
    const r = verifyLicenseWith(key, pub)
    expect(r.valid).toBe(true)
    expect(r.email).toBe('a@b.com')
  })

  it('rejects a tampered payload', () => {
    const { pub, priv } = makeKeypair()
    const key = issue(priv, { email: 'a@b.com', plan: 'premium', iat: 1700000000 })
    const tampered = key.replace(/\.[^.]+\./, '.ZZZZ.')
    expect(verifyLicenseWith(tampered, pub).valid).toBe(false)
  })

  it('rejects a key signed by a different private key', () => {
    const a = makeKeypair()
    const b = makeKeypair()
    const key = issue(a.priv, { email: 'a@b.com', plan: 'premium', iat: 1700000000 })
    expect(verifyLicenseWith(key, b.pub).valid).toBe(false)
  })

  it('rejects an expired license', () => {
    const { pub, priv } = makeKeypair()
    const key = issue(priv, { email: 'a@b.com', plan: 'premium', iat: 1, exp: 1000 })
    const r = verifyLicenseWith(key, pub)
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/expired/i)
  })

  it('rejects malformed input', () => {
    const { pub } = makeKeypair()
    expect(verifyLicenseWith('not-a-key', pub).valid).toBe(false)
    expect(verifyLicenseWith('', pub).valid).toBe(false)
  })
})
