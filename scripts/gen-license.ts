/* Sign a Pro license key for a buyer (offline).
 * Usage:
 *   npx tsx scripts/gen-license.ts buyer@email.com            # lifetime
 *   npx tsx scripts/gen-license.ts buyer@email.com 365        # 365-day
 * Private key from env LICENSE_PRIVATE_KEY or ./.license-private.pem.
 */
import { readFileSync } from 'node:fs'
import { sign as edSign, createPrivateKey } from 'node:crypto'

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: tsx scripts/gen-license.ts <email> [days]')
  process.exit(1)
}
const days = process.argv[3] ? Number(process.argv[3]) : 0

const pem = process.env.LICENSE_PRIVATE_KEY || readFileSync('.license-private.pem', 'utf8')
const priv = createPrivateKey(pem)

const now = Math.floor(Date.now() / 1000)
const payload: Record<string, unknown> = { email, plan: 'premium', iat: now }
if (days > 0) payload.exp = now + days * 86400

const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)))
const sig = b64url(edSign(null, Buffer.from(payloadB64), priv))
console.log(`aplomb-pro.${payloadB64}.${sig}`)
