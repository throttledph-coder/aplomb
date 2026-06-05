// Throwaway smoke for the applications tracker DB layer (step 11).
// Runs under Electron (better-sqlite3 is Electron-ABI).
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initDatabase, closeDatabase } from '../src/lib/database/db'
import * as q from '../src/lib/database/queries'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

const dbPath = join(tmpdir(), `clarity-apps-${Date.now()}.db`)
function cleanup(): void {
  closeDatabase()
  for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) {
    if (existsSync(f)) rmSync(f, { force: true })
  }
}

try {
  initDatabase(dbPath)
  const a = q.createApplication({ company: 'Globex', job_title: 'Staff Eng', job_url: 'https://x', notes: 'referral' })
  assert(a.id > 0 && a.status === 'wishlist', 'createApplication defaults to wishlist')
  assert(q.listApplications().length === 1, 'listApplications returns 1')

  const upd = q.updateApplication(a.id, { status: 'applied', applied_at: new Date().toISOString() })
  assert(upd?.status === 'applied', 'updateApplication changes status')
  assert(q.getApplication(a.id)?.job_url === 'https://x', 'job_url persisted')

  q.createApplication({ company: 'Acme', job_title: 'SWE', status: 'interview' })
  assert(q.listApplications().length === 2, 'second application added')

  q.deleteApplication(a.id)
  assert(q.listApplications().length === 1, 'deleteApplication removes row')

  console.log('\nAPPLICATIONS SMOKE TEST PASSED')
  cleanup()
  process.exit(0)
} catch (err) {
  console.error('\nAPPLICATIONS SMOKE FAILED:', (err as Error).message)
  cleanup()
  process.exit(1)
}
