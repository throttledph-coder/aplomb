// Offline license verification (main-process only — uses node:crypto).
// Pro licenses are Ed25519-signed by the vendor's private key; the app embeds
// only the public key and verifies offline. No network, no account.
import { verify as edVerify } from 'node:crypto'

// Embedded Ed25519 PUBLIC verify key. Rotate by regenerating a keypair
// (scripts/gen-keypair.ts) and replacing this constant.
export const EMBEDDED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAbhrjnvIVodBFuWNgKSXXzyg489nTBT4lMKWCd0B1X+g=
-----END PUBLIC KEY-----`

const PREFIX = 'aplomb-pro'

export interface LicensePayload {
  email: string
  plan: string
  iat: number // issued-at (epoch seconds)
  exp?: number // optional expiry (epoch seconds)
}

export interface LicenseResult {
  valid: boolean
  email?: string
  plan?: string
  expires?: number | null
  error?: string
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

// Verify a license key against a specific public key (exported for tests).
export function verifyLicenseWith(key: string, publicKeyPem: string): LicenseResult {
  const parts = (key ?? '').trim().split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    return { valid: false, error: 'Invalid license format.' }
  }
  const [, payloadB64, sigB64] = parts
  let payload: LicensePayload
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as LicensePayload
  } catch {
    return { valid: false, error: 'Corrupt license payload.' }
  }
  let ok = false
  try {
    ok = edVerify(null, Buffer.from(payloadB64), publicKeyPem, b64urlDecode(sigB64))
  } catch {
    return { valid: false, error: 'Signature check failed.' }
  }
  if (!ok) return { valid: false, error: 'License signature does not match.' }
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return { valid: false, error: 'License expired.', email: payload.email, expires: payload.exp }
  }
  return {
    valid: true,
    email: payload.email,
    plan: payload.plan || 'premium',
    expires: payload.exp ?? null,
  }
}

export function verifyLicense(key: string): LicenseResult {
  return verifyLicenseWith(key, EMBEDDED_PUBLIC_KEY)
}
