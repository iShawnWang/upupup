# Scheduler Worker and Observability Design

## Architecture

The Next.js process serves the dashboard and records web-process event-loop delay only. A separate compiled Node.js entry point owns `startCron()`, worker event-loop monitoring, and graceful shutdown. Both processes use the same SQLite file; WAL remains enabled so reads and writes retain the existing concurrency model.

The worker is compiled with a dedicated TypeScript configuration into `dist-worker/`. PM2 runs the web and worker entries as separate apps. Docker Compose runs the existing standalone Next.js image plus a worker-target image built from the same source and production dependencies.

## Bucket Deduplication

At each wake-up, the worker queries all configured monitor names that already have records in the current bucket. It filters the configured monitor list against that set and executes checks only for missing names. An empty missing list skips the cycle; a partial list retries only failed or absent monitors. The existing `activeRuns` guard remains the first overlap check.

## SQL Observability

All database calls are owned by `lib/db.ts`. A single timing helper wraps schema initialization, reads, inserts, and cleanup. Logs contain a stable statement name, operation type, elapsed milliseconds, success/error status, and result cardinality when available. SQL parameters, URLs, response bodies, and error record contents are never logged.

Dashboard route code consumes typed database helper functions instead of preparing statements directly, ensuring dashboard SQL cannot bypass timing logs.

## Event-Loop Observability

A shared runtime monitor samples delay once per second, emits a 30-second average/max summary, and warns when a sample exceeds 250ms. Module-level idempotency prevents duplicate timers within one process. The web instrumentation hook labels metrics as `web`; the worker labels them as `worker`.

## Error Handling and Shutdown

SQL timing logs record failures and rethrow the original error. Per-monitor failures continue to use `Promise.allSettled`. Worker startup failures set a non-zero exit status. `SIGINT` and `SIGTERM` stop cron, stop event-loop monitoring, close SQLite, and let the process exit.

## Validation

A Node test compiled from TypeScript uses an isolated temporary SQLite file to prove that bucket lookup returns only existing monitor names and that filtering selects only missing monitors. Validation also runs strict TypeScript checking, worker compilation, tests, and the full Next.js production build.
