# Scheduler Worker and Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run scheduled checks in an isolated worker, deduplicate each monitor independently, and expose SQL plus event-loop latency.

**Architecture:** The Next.js process owns HTTP traffic and web event-loop metrics. A CommonJS worker compiled by TypeScript owns cron, worker metrics, and shutdown; both processes share the WAL-mode SQLite file through timed database helpers.

**Tech Stack:** Next.js 16, TypeScript 5, Node.js 20, better-sqlite3, node-cron, PM2, Docker Compose, Node test runner.

## Global Constraints

- Do not log SQL parameters or stored record contents.
- Keep database-backed time-bucket deduplication and `activeRuns` overlap prevention.
- Do not add distributed locking.
- Preserve the current check interval and SQLite WAL behavior.

---

### Task 1: Timed Database Boundary and Per-Monitor Lookup

**Files:**
- Modify: `lib/db.ts`
- Modify: `app/api/dashboard/route.ts`
- Test: `tests/cron-bucket.test.ts`

**Interfaces:**
- Produces: `getCheckRecordNamesInRange(names, startIso, endIso): string[]`
- Produces: typed latest/history/uptime dashboard query helpers.
- Produces: `closeDb(): void` for worker and test shutdown.

- [ ] Add one timing wrapper that logs statement name, operation, duration, status, and cardinality without values.
- [ ] Route initialization, insert, range lookup, cleanup, and dashboard reads through the wrapper.
- [ ] Replace direct dashboard `prepare()` calls with typed database helpers.
- [ ] Write a temporary-database regression test proving one existing monitor does not mark other configured monitors complete.
- [ ] Compile and run the regression test.

### Task 2: Scheduler Selection and Runtime Metrics

**Files:**
- Modify: `lib/cron.ts`
- Create: `lib/runtime-observability.ts`

**Interfaces:**
- Produces: `getMonitorsToCheck(monitors, startIso, endIso): MonitorConfig[]`.
- Produces: `startEventLoopDelayMonitor(label): () => void`.

- [ ] Query existing names after the active-run guard and filter only missing monitors.
- [ ] Skip with an explicit `bucket-complete` reason when none are missing.
- [ ] Execute `Promise.allSettled` only for missing monitors and log total versus selected counts.
- [ ] Add 1-second event-loop sampling, 30-second summary logging, and a 250ms warning threshold.
- [ ] Remove the redundant scheduler heartbeat timer.

### Task 3: Dedicated Worker and Deployment

**Files:**
- Create: `worker.ts`
- Create: `tsconfig.worker.json`
- Modify: `instrumentation.ts`
- Modify: `package.json`
- Modify: `ecosystem.config.js`
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Modify: `README.zh-CN.md`

**Interfaces:**
- Produces: `dist-worker/worker.js` runnable with Node.js 20.
- Consumes: `startCron`, `stopCron`, `closeDb`, and `startEventLoopDelayMonitor`.

- [ ] Remove scheduler startup from Next instrumentation and start web event-loop monitoring there.
- [ ] Add worker startup and idempotent signal shutdown.
- [ ] Add worker build/start/test scripts without changing runtime monitoring configuration.
- [ ] Configure PM2 with one web app and one worker app.
- [ ] Add a Docker worker target with production dependencies and a Compose worker service sharing `./data`.
- [ ] Update English and Chinese deployment instructions for separate web and worker startup.

### Task 4: Full Verification

**Files:**
- Verify all files above.

- [ ] Run `pnpm test` and require zero failed tests.
- [ ] Run `pnpm exec tsc --noEmit --incremental false` and require exit code 0.
- [ ] Run `pnpm build:worker` and require `dist-worker/worker.js`.
- [ ] Run `pnpm build` and require a successful Next.js production build.
- [ ] Inspect `git diff --check` and confirm no whitespace errors.
