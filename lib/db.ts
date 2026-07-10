import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import { getDbPath } from "./config"

let db: Database.Database | null = null

type SqlOperation = "pragma" | "exec" | "get" | "all" | "run"

interface SqlResultSummary {
  rows?: number
  changes?: number
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code)
  }
  return error instanceof Error ? error.name : typeof error
}

function runTimedSql<T>(
  name: string,
  operation: SqlOperation,
  execute: () => T,
  summarize: (result: T) => SqlResultSummary = () => ({})
): T {
  const startedAt = performance.now()

  try {
    const result = execute()
    const durationMs = performance.now() - startedAt
    const summary = summarize(result)
    const rows = summary.rows === undefined ? "" : ` rows=${summary.rows}`
    const changes = summary.changes === undefined ? "" : ` changes=${summary.changes}`
    console.log(
      `[sql] name=${name} op=${operation} status=ok durationMs=${durationMs.toFixed(2)}${rows}${changes}`
    )
    return result
  } catch (error) {
    const durationMs = performance.now() - startedAt
    console.error(
      `[sql] name=${name} op=${operation} status=error durationMs=${durationMs.toFixed(2)} errorCode=${errorCode(error)}`
    )
    throw error
  }
}

function getDb() {
  if (db) return db

  const dbPath = getDbPath()
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(dbPath)
  runTimedSql(
    "db.journal-mode-wal",
    "pragma",
    () => db!.pragma("journal_mode = WAL") as unknown[],
    (rows) => ({ rows: rows.length })
  )

  runTimedSql("db.create-check-history", "exec", () => db!.exec(`
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
  `))

  runTimedSql("db.create-name-time-index", "exec", () => db!.exec(`
    CREATE INDEX IF NOT EXISTS idx_name_time
      ON check_history(name, checked_at DESC);
  `))

  runTimedSql("db.create-checked-at-index", "exec", () => db!.exec(`
    CREATE INDEX IF NOT EXISTS idx_checked_at
      ON check_history(checked_at DESC);
  `))

  return db
}

export function closeDb() {
  if (!db) return
  db.close()
  db = null
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

export interface UptimeCounts {
  total: number
  up: number | null
}

export function insertCheckRecord(record: Omit<CheckRecord, "id">) {
  const database = getDb()
  return runTimedSql(
    "check-history.insert",
    "run",
    () => database.prepare(`
      INSERT INTO check_history (name, url, status, latency_ms, status_code, keyword_ok, error, checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.name,
      record.url,
      record.status,
      record.latency_ms,
      record.status_code,
      record.keyword_ok,
      record.error,
      record.checked_at
    ),
    (result) => ({ changes: result.changes })
  )
}

export function getCheckRecordNamesInRange(names: string[], startIso: string, endIso: string): string[] {
  if (names.length === 0) return []

  const database = getDb()
  const placeholders = names.map(() => "?").join(", ")
  const rows = runTimedSql(
    "check-history.names-in-range",
    "all",
    () => database
      .prepare(`
        SELECT DISTINCT name
        FROM check_history
        WHERE name IN (${placeholders})
          AND checked_at >= ?
          AND checked_at < ?
      `)
      .all(...names, startIso, endIso) as Array<{ name: string }>,
    (result) => ({ rows: result.length })
  )

  return rows.map((row) => row.name)
}

export function getLatestCheckRecord(name: string): CheckRecord | undefined {
  const database = getDb()
  return runTimedSql(
    "check-history.latest-by-name",
    "get",
    () => database
      .prepare("SELECT * FROM check_history WHERE name = ? ORDER BY checked_at DESC LIMIT 1")
      .get(name) as CheckRecord | undefined,
    (result) => ({ rows: result ? 1 : 0 })
  )
}

export function getCheckRecordsSince(name: string, sinceIso: string): CheckRecord[] {
  const database = getDb()
  return runTimedSql(
    "check-history.since-by-name",
    "all",
    () => database
      .prepare("SELECT * FROM check_history WHERE name = ? AND checked_at >= ? ORDER BY checked_at DESC")
      .all(name, sinceIso) as CheckRecord[],
    (result) => ({ rows: result.length })
  )
}

export function getUptimeCounts(name: string, sinceIso: string): UptimeCounts {
  const database = getDb()
  return runTimedSql(
    "check-history.uptime-counts-by-name",
    "get",
    () => database
      .prepare(`
        SELECT COUNT(*) AS total,
          SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS up
        FROM check_history
        WHERE name = ? AND checked_at > ?
      `)
      .get(name, sinceIso) as UptimeCounts,
    () => ({ rows: 1 })
  )
}

export function cleanOldHistory(days: number) {
  const database = getDb()
  const result = runTimedSql(
    "check-history.clean-old",
    "run",
    () => database.prepare(`
      DELETE FROM check_history
      WHERE checked_at < datetime('now', '-' || ? || ' days')
    `).run(days),
    (runResult) => ({ changes: runResult.changes })
  )
  console.log(`[cleanOldHistory] 删除了 ${result.changes} 条旧记录`)
}
