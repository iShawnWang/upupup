# Backend Development Guidelines

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Runtime Jobs](./runtime-jobs.md) | Scheduler process, SQLite boundaries, and runtime observability | Active |

## Pre-Development Checklist

For scheduled jobs, database access, or deployment process changes:

1. Read [Runtime Jobs](./runtime-jobs.md).
2. Confirm whether the change affects the web process, worker process, or both.
3. Preserve per-monitor bucket semantics and parameter-free SQL logs.

## Quality Check

- Run `pnpm test`.
- Run `pnpm exec tsc --noEmit --incremental false` after `pnpm build` when both commands are needed; do not run them concurrently because Next regenerates `.next/types`.
- Run `pnpm build`.
- Smoke-test worker startup plus `SIGINT` or `SIGTERM` shutdown when worker lifecycle code changes.
