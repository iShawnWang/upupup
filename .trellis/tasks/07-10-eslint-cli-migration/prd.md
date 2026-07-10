# Migrate Next lint to ESLint CLI

## Goal

Replace removed next lint command with ESLint 9 flat config and fix migration-revealed lint issues.

## Requirements

- Replace the removed `next lint` package script with direct ESLint CLI commands.
- Add an ESLint 9 flat configuration based on `eslint-config-next/core-web-vitals`.
- Ignore generated Next.js, worker, test, coverage, and build output.
- Add a separate autofix script without running autofix automatically.
- Fix only actionable lint findings required for `pnpm lint` to pass; avoid unrelated refactors.
- Preserve the existing TypeScript, test, worker, and production build behavior.

## Acceptance Criteria

- [x] `pnpm lint` invokes ESLint directly and exits successfully.
- [x] `pnpm lint:fix` is available for explicit autofix use.
- [x] Generated output is excluded from linting.
- [x] Tests, TypeScript checking, and the production build still pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
