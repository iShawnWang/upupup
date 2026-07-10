import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import type { MonitorConfig } from "../lib/config"
import { getMonitorsToCheck } from "../lib/cron"
import { closeDb, insertCheckRecord } from "../lib/db"

test("selects only monitors missing from the current time bucket", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "upupup-cron-bucket-"))
  const originalDbPath = process.env.DB_PATH
  process.env.DB_PATH = path.join(tempDir, "monitor.db")
  const sqlLogs: string[] = []
  const originalConsoleLog = console.log
  console.log = (...args: unknown[]) => {
    sqlLogs.push(args.map(String).join(" "))
  }

  const monitors: MonitorConfig[] = [
    { name: "existing", url: "https://existing.example", method: "GET", expectedStatus: 200 },
    { name: "missing", url: "https://missing.example", method: "GET", expectedStatus: 200 },
  ]

  try {
    insertCheckRecord({
      name: "existing",
      url: "https://existing.example",
      status: "up",
      latency_ms: 10,
      status_code: 200,
      keyword_ok: null,
      error: null,
      checked_at: "2026-07-10T10:00:15.000Z",
    })

    const selected = getMonitorsToCheck(
      monitors,
      "2026-07-10T10:00:00.000Z",
      "2026-07-10T10:01:00.000Z"
    )

    assert.deepEqual(selected.map((monitor) => monitor.name), ["missing"])
    assert.ok(sqlLogs.some((line) => line.includes("name=check-history.names-in-range")))
    assert.ok(sqlLogs.every((line) => !line.includes("https://existing.example")))
    assert.ok(sqlLogs.every((line) => !line.includes("2026-07-10T10:00:15.000Z")))
  } finally {
    console.log = originalConsoleLog
    closeDb()
    if (originalDbPath === undefined) {
      delete process.env.DB_PATH
    } else {
      process.env.DB_PATH = originalDbPath
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})
