# Separate scheduler worker and observability

## Goal

Run cron in a dedicated worker, deduplicate checks per monitor and time bucket, and log every SQL duration plus event-loop delay.

## Requirements

- Run scheduled monitoring in a dedicated Node.js worker process instead of the Next.js web process.
- Keep PM2 and Docker Compose deployment paths functional with one web process and one worker process sharing the same SQLite database.
- Before each scheduled run, identify which configured monitor names already have a record in the current time bucket and run only the missing monitors.
- Preserve the existing in-process overlap guard for a still-running worker cycle.
- Log the duration and outcome metadata of every SQLite statement without logging SQL parameters or record contents.
- Record periodic event-loop delay metrics and warn when an individual delay exceeds the fixed threshold in both web and worker processes.
- Keep SQLite WAL mode and the existing check interval semantics.
- Do not add multi-instance distributed locking or remove database-backed bucket deduplication.

## Acceptance Criteria

- [ ] The Next.js instrumentation hook does not start the scheduler.
- [ ] A separately built worker starts and stops the scheduler cleanly on `SIGINT` and `SIGTERM`.
- [ ] PM2 and Docker Compose start exactly one web process and one worker process.
- [ ] If only some monitors have records in a bucket, the worker checks only the missing monitors.
- [ ] SQL logs include a stable query name, operation, duration, status, and row/change count where applicable, without parameter values.
- [ ] Web and worker logs include periodic event-loop delay summaries and threshold warnings.
- [ ] Automated regression coverage proves per-monitor bucket selection.
- [ ] Type checking, tests, and the production build pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
