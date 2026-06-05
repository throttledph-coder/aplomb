import Database from 'better-sqlite3'
import { applySchema } from './schema'

// Connection singleton. Kept electron-free (caller supplies the path) so the
// data layer stays node-testable without spinning up Electron.
let db: Database.Database | null = null

export function initDatabase(dbPath: string): Database.Database {
  if (db) return db
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  applySchema(db)
  return db
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase(dbPath) first.')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
