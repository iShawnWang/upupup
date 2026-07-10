# ESLint CLI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the removed Next.js lint command with ESLint 9 Flat Config and leave the repository lint-clean.

**Architecture:** ESLint runs directly from package scripts. `eslint.config.mjs` composes the installed Next.js Core Web Vitals and TypeScript flat presets with project output ignores.

**Tech Stack:** Next.js 16.2.6, ESLint 9.39.4, eslint-config-next 16.2.6, TypeScript 5.9.

## Global Constraints

- Do not add dependencies because all required ESLint packages are already installed.
- Do not run autofix automatically.
- Do not refactor unrelated application behavior.

---

### Task 1: Migrate the Lint Entry Point

**Files:**
- Create: `eslint.config.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm lint` → `eslint .`
- Produces: `pnpm lint:fix` → `eslint . --fix`

- [x] Create `eslint.config.mjs` with the following composition:

```js
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "dist-worker/**", ".test-dist/**", "coverage/**"]),
])
```

- [x] Replace `next lint` with `eslint .` and add the opt-in `lint:fix` script.
- [x] Run `pnpm lint`; inspect every finding before making source changes.

### Task 2: Resolve Findings and Verify

**Files:**
- Modify only files named by actionable ESLint findings.

**Interfaces:**
- Consumes: the Flat Config and existing application source.
- Produces: a zero-exit lint command without suppressing rules globally.

- [x] Fix actionable findings without unrelated refactors or blanket disable comments.
- [x] Run `pnpm lint` and require exit code 0.
- [x] Run `pnpm test` and require zero failed tests.
- [x] Run `pnpm build`, then `pnpm exec tsc --noEmit --incremental false`, sequentially, and require exit code 0.
- [x] Run `git diff --check`.
