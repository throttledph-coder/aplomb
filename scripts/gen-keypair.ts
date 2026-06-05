/* Generate a fresh Ed25519 license keypair.
 * Usage:  npx tsx scripts/gen-keypair.ts
 * Paste the PUBLIC key into src/lib/license.ts (EMBEDDED_PUBLIC_KEY) and keep
 * the PRIVATE key secret (save to .license-private.pem — gitignored).
 */
import { generateKeyPairSync } from 'node:crypto'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
console.log('\n=== PUBLIC KEY (embed in src/lib/license.ts) ===\n')
console.log(publicKey.export({ type: 'spki', format: 'pem' }).toString().trim())
console.log('\n=== PRIVATE KEY (keep secret — .license-private.pem) ===\n')
console.log(privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim())
console.log('')
