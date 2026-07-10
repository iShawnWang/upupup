# Implementation Plan

1. Add shared event-loop delay monitoring and replace the cron heartbeat with worker-level monitoring.
2. Centralize dashboard and scheduler SQLite statements in timed `lib/db.ts` helpers.
3. Change cron bucket selection to query existing monitor names and execute only missing monitors.
4. Add the standalone worker entry point and worker TypeScript build configuration.
5. Update package scripts, Next instrumentation, PM2, Dockerfile, Docker Compose, and deployment documentation.
6. Add an isolated regression test for per-monitor bucket selection.
7. Run tests, strict type checking, worker compilation, and the production build.
