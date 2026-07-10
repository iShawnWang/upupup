# Quality Guidelines

## Required checks

The repository defines these package scripts in `package.json`:

- `pnpm lint` → `eslint .`
- `pnpm lint:fix` → `eslint . --fix` (explicit opt-in only)
- `pnpm test` → compile TypeScript tests and run the Node test runner
- `pnpm build` → `next build`

ESLint uses `eslint.config.mjs` with `eslint-config-next/core-web-vitals`. Generated Next.js, worker, test, coverage, and build output is ignored. For TypeScript changes, also run `pnpm exec tsc --noEmit`. For changes to API, database, monitoring, or deployment behavior, include a successful production build in verification.

## Scenario: ESLint CLI contract

### 1. Scope / Trigger

Read this contract when changing package lint scripts, ESLint presets, generated-output ignores, React hook lint fixes, or CI quality commands. Next.js 16 removed `next lint`; do not restore it.

### 2. Signatures

```text
pnpm lint      -> eslint .
pnpm lint:fix  -> eslint . --fix
```

`eslint.config.mjs` composes `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, and project-level global ignores. Next.js documents the TypeScript preset as an additional rule set used alongside Core Web Vitals.

### 3. Contracts

- `pnpm lint` is read-only and must exit `0` with no errors.
- `pnpm lint:fix` may modify files and is run only when explicitly requested.
- Generated directories `.next`, `out`, `build`, `dist-worker`, `.test-dist`, and `coverage` are excluded.
- Do not disable a lint rule globally to hide an actionable source finding.

### 4. Validation & Error Matrix

| Condition | Required behavior |
|-----------|-------------------|
| ESLint reports a source error | Inspect and make the smallest behavior-preserving source fix. |
| Finding is in generated output | Add the generated directory to global ignores, not an inline suppression. |
| React flags synchronous state in an Effect | Prefer deriving state or a hydration-safe external-store boundary. |
| Autofix would touch unrelated files | Do not run `lint:fix`; edit the specific finding manually. |

### 5. Good / Base / Bad Cases

- Good: shared hydration detection uses `useHydrated()` and passes the React hooks preset.
- Base: `pnpm lint` checks the repository and exits without changing files.
- Bad: `next lint` treats `lint` as a project directory on Next.js 16 and fails before checking source.

### 6. Tests Required

- Run `pnpm lint` after config or React hook changes and assert exit code `0`.
- Run `pnpm test` after source changes.
- Run `pnpm build`, then `pnpm exec tsc --noEmit --incremental false` sequentially.

### 7. Wrong vs Correct

#### Wrong

```json
{ "lint": "next lint" }
```

#### Correct

```json
{
  "lint": "eslint .",
  "lint:fix": "eslint . --fix"
}
```

If a project command is unavailable or fails because of the installed framework version, report the exact command and error rather than claiming it passed.

## Accessibility and interaction

- Use semantic elements for the interaction: buttons for actions, headings for card titles, and `aria-label` for compact history cells (`components/history-grid.tsx`).
- Icon-only controls must include visually hidden text. `ThemeToggle` and `LanguageToggle` use `sr-only` labels.
- Preserve Radix keyboard/focus behavior by using the existing `DropdownMenu` and `HoverCard` wrappers.
- Keep visible focus styles from the shared button variants; do not remove `outline`/focus-ring behavior from interactive primitives.
- Ensure loading and error states remain readable. `app/page.tsx` renders localized loading/error text instead of leaving an empty page.

## Error handling and diagnostics

- Check `Response.ok` before parsing successful API data and log non-abort fetch errors (`app/page.tsx`, `components/dashboard-view.tsx`).
- Server boundaries log with a subsystem prefix such as `[dashboard]`, `[check]`, `[cron]`, or `[process]` and return a safe `NextResponse` error from the route handler (`app/api/dashboard/route.ts`, `lib/checker.ts`, `lib/cron.ts`).
- Preserve per-monitor failure isolation in the dashboard route: a failed monitor query produces a down fallback record for that monitor instead of crashing the entire response.
- Do not expose secrets or environment contents in browser logs or rendered error text.

## Visual and responsive consistency

- Follow the existing Tailwind token system from `app/globals.css` and support the established light/dark theme classes.
- Prefer the responsive utility patterns already used in the dashboard (`sm:`, `md:`, `lg:`) and preserve compact layouts on small screens.
- Use `cn` for conditional classes and `lucide-react` for icons. Avoid inline style objects for values already represented by Tailwind tokens.

## Current limitations

- Automated coverage currently contains a scheduler/database regression test only; frontend integration and accessibility tests are not present. Manual verification should cover initial loading, empty/error API data, range switching, 30-second refresh cleanup, locale switching, theme switching, and keyboard access to controls.
- Do not add generic test instructions to a change report; add a test only when the repository gains a test runner and a stable test pattern.
