# Scheduler Worker and Observability Design

## Goal

Prevent dashboard work from delaying scheduled checks by running cron in a dedicated process, while fixing time-bucket deduplication per monitor and making SQL/event-loop latency observable.

## Process Boundaries

The Next.js process serves the dashboard and starts only web event-loop monitoring. A separately compiled Node.js worker owns the scheduler and graceful shutdown. PM2 and Docker Compose each run one web process and one worker process. Both processes share the configured SQLite file and retain WAL mode.

The worker is compiled with a dedicated TypeScript configuration into `dist-worker/`; it does not start another Next.js server. Local and PM2 worker startup load the existing `.env`, while Docker Compose injects the same environment into both services.

## Per-Monitor Bucket Selection

Each scheduler wake-up queries the configured monitor names already present in the current time bucket, then executes only monitors absent from that result. This keeps the 30-second wake-up behavior for a 60-second target interval while allowing a monitor whose previous write failed to retry independently. The in-memory `activeRuns` overlap guard remains.

## SQL Timing

Every SQLite operation is routed through typed helpers in `lib/db.ts` and a shared timing wrapper. A log entry includes statement name, operation, duration, status, and row/change count where applicable. It never includes bind parameters, URLs, response bodies, or stored error text. The dashboard route no longer calls `prepare()` directly.

## Event-Loop Delay

Web and worker processes sample event-loop delay every second. Every 30 seconds they log average and maximum delay; a single sample over 250ms produces a warning. Monitoring startup is idempotent per process.

## Shutdown and Errors

The worker handles `SIGINT` and `SIGTERM` by stopping cron and event-loop timers and closing SQLite. SQL errors are timed, logged without sensitive values, and rethrown. Existing per-monitor error isolation remains unchanged.

## Verification

An isolated SQLite regression test covers partial bucket completion. The delivery gate includes the Node test suite, strict TypeScript checking, standalone worker compilation, and the Next.js production build.
