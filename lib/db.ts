import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import { getDbPath } from "./config"

let db: Database.Database | null = null

export function getDb() {
  if (db) return db

  const dbPath = getDbPath()
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(dbPath)
  db.pragma("journal_mode = WAL")

  db.exec(`
    CREATE TABLE IF NOT EXISTS check_history (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      url          TEXT NOT NULL,
      status       TEXT NOT NULL,
      latency_ms   INTEGER,
      status_code  INTEGER,
      keyword_ok   INTEGER,
      error        TEXT,
      checked_at   TEXT DEFAULT (datetime('now'))
    );
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_name_time
      ON check_history(name, checked_at DESC);
  `)

  return db
}

export interface CheckRecord {
  id: number
  name: string
  url: string
  status: "up" | "down"
  latency_ms: number | null
  status_code: number | null
  keyword_ok: number | null
  error: string | null
  checked_at: string
}

export function insertCheckRecord(record: Omit<CheckRecord, "id">) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO check_history (name, url, status, latency_ms, status_code, keyword_ok, error, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    record.name,
    record.url,
    record.status,
    record.latency_ms,
    record.status_code,
    record.keyword_ok,
    record.error,
    record.checked_at
  )
}

export function cleanOldHistory(days: number) {
  const db = getDb()
  const stmt = db.prepare(`
    DELETE FROM check_history
    WHERE checked_at < datetime('now', '-' || ? || ' days')
  `)
  const result = stmt.run(days)
  console.log(`[cleanOldHistory] 删除了 ${result.changes} 条旧记录`)
}
