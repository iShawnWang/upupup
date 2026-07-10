# Quality Guidelines

## Required checks

The repository defines these package scripts in `package.json`:

- `pnpm lint` → `next lint`
- `pnpm build` → `next build`

There is no ESLint flat config (`eslint.config.js/mjs/cjs`), no test script, and no test/spec directory in the current repository. For TypeScript changes, also run `pnpm exec tsc --noEmit`. For changes to API, database, monitoring, or deployment behavior, include a successful production build in verification.

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

- Automated unit, integration, and accessibility tests are not present. Manual verification should cover initial loading, empty/error API data, range switching, 30-second refresh cleanup, locale switching, theme switching, and keyboard access to controls.
- Do not add generic test instructions to a change report; add a test only when the repository gains a test runner and a stable test pattern.
