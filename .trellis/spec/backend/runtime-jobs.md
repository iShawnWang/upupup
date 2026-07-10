# Runtime Jobs

## Scenario: Dedicated Scheduler Worker

### 1. Scope / Trigger

Read this contract when changing scheduled checks, SQLite access, SQL logging, event-loop monitoring, PM2 apps, or Docker services. The scheduler must remain isolated from dashboard request work so synchronous SQLite reads in the web process cannot delay cron callbacks.

### 2. Signatures

```ts
getMonitorsToCheck(
  monitors: MonitorConfig[],
  bucketStartIso: string,
  bucketEndIso: string
): MonitorConfig[]

getCheckRecordNamesInRange(
  names: string[],
  startIso: string,
  endIso: string
): string[]

startEventLoopDelayMonitor(label: string): () => void
closeDb(): void
```

`worker.ts` is the only scheduler entry point. `instrumentation.ts` may start web runtime observability but must not import or call `startCron()`.

### 3. Contracts

- `MONITORS`: required JSON array for the worker; monitor `name` is the bucket-deduplication identity.
- `CHECK_INTERVAL_SECONDS`: optional, defaults to `60`, minimum `30`.
- `HISTORY_RETENTION_DAYS`: optional, defaults to `90`, minimum `1`.
- `DB_PATH`: optional, defaults to `./data/monitor.db`; web and worker must resolve to the same file.
- PM2 app names: `upupup-web` and `upupup-worker`.
- Docker Compose service names: `upupup-web` and `upupup-worker`; both mount `./data:/app/data`.
- SQL log fields: `name`, `op`, `status`, `durationMs`, plus `rows` or `changes` when available. Bind values and record contents are forbidden.
- Event-loop logs sample every second, summarize every 30 seconds, and warn above `250ms`.

### 4. Validation & Error Matrix

| Condition | Required behavior |
|-----------|-------------------|
| `MONITORS` missing or invalid | Worker startup fails with non-zero exit status. |
| Previous scheduler cycle is active | Skip with `reason=active-run`. |
| Every monitor exists in the bucket | Skip with `reason=bucket-complete`. |
| Only some monitors exist in the bucket | Run only missing monitor names. |
| SQL statement fails | Log stable statement metadata and error code, then rethrow without values. |
| Worker receives `SIGINT` or `SIGTERM` | Stop cron and event-loop timers, close SQLite, exit cleanly. |

### 5. Good / Base / Bad Cases

- Good: one of three monitors failed to save; the next wake-up queries existing names and retries only that monitor.
- Base: all monitors saved in the current bucket; the second wake-up performs no checks.
- Bad: a global `SELECT 1` finds any row and suppresses the whole configured monitor set.

### 6. Tests Required

- Unit/regression: insert one monitor into an isolated SQLite bucket and assert `getMonitorsToCheck()` returns only the missing monitor.
- Privacy assertion: SQL timing logs contain the stable statement name but not URL, timestamp bind value, response body, or stored error text.
- Worker smoke: compile `dist-worker/worker.js`, start with an isolated `DB_PATH`, send `SIGINT` or `SIGTERM`, and assert exit code `0`.
- Process-boundary smoke: call the production Dashboard API and assert SQL logs appear without any cron startup log in the web process.

### 7. Wrong vs Correct

#### Wrong

```ts
if (hasCheckRecordInRange(bucketStartIso, bucketEndIso)) return
```

This treats one successful monitor as completion for every monitor.

#### Correct

```ts
const monitorsToCheck = getMonitorsToCheck(monitors, bucketStartIso, bucketEndIso)
if (monitorsToCheck.length === 0) return
await Promise.allSettled(monitorsToCheck.map(checkAndSave))
```

Database callers must use typed helpers in `lib/db.ts`; do not export the raw database handle or prepare statements in routes and workers.
