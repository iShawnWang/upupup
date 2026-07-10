# Hook Guidelines

## Current hook model

Shared hooks live in the root `hooks/` directory; feature-specific effects remain close to the component that owns the behavior:

- `app/page.tsx` performs the initial dashboard fetch.
- `components/dashboard-view.tsx` owns selected-range persistence, dashboard refresh, and summary derivation.
- `hooks/use-hydrated.ts` owns the shared hydration boundary used by theme and i18n code.
- `components/theme-toggle.tsx` uses `useTheme` plus `useHydrated()`.
- `lib/i18n/context.tsx` owns the `I18nProvider` and exposes the `useI18n` context hook.

Reusable hook logic follows the `useXxx` naming convention and belongs in the root `hooks/` directory (the configured shadcn alias is `@/hooks`) only when shared by multiple features. Do not create a hook wrapper for a single call site without a clear reuse boundary.

## Effects and cleanup

- Include all values used by an effect in its dependency array. The dashboard polling effect depends on `selectedRangeId`.
- Guard asynchronous state updates after unmount. `app/page.tsx` and `components/dashboard-view.tsx` use an `isMounted` flag and check it before setting state.
- Always clear timers in the effect cleanup. `DashboardView` calls `clearInterval(intervalId)` when the component unmounts or the selected range changes; `lib/checker.ts` clears its request timeout in `finally`.
- Do not start polling or timers during render. Start them in `useEffect` or in the server scheduler lifecycle.
- Keep browser-only APIs (`window`, `localStorage`, `document`, `navigator`) inside client components/effects or guarded code paths. `DashboardView` checks `typeof window` during initial state setup.
- Use `useHydrated()` when browser-only rendering must remain hidden through server render and initial hydration. Do not create a mounted flag by synchronously calling `setState` in an empty Effect.

## Fetching pattern

The current dashboard uses native `fetch` with `cache: "no-store"`, checks `res.ok`, parses JSON, and logs non-abort errors (`app/page.tsx`, `components/dashboard-view.tsx`). Preserve this pattern unless the project deliberately adopts a data-fetching library.

Polling is currently 30 seconds and is keyed by the selected history range. The cleanup must prevent duplicate intervals when the range changes.

The local cleanup pattern is:

```tsx
useEffect(() => {
  let isMounted = true
  const intervalId = setInterval(fetchData, 30000)
  return () => {
    isMounted = false
    clearInterval(intervalId)
  }
}, [selectedRangeId])
```

## Context hooks

Context providers should expose a typed value and a hook that fails clearly outside its provider. `useI18n` in `lib/i18n/context.tsx` throws `useI18n must be used within an I18nProvider`; follow that behavior for new required contexts.

## Avoid

- Do not use `setInterval` without cleanup or create one interval per rendered card.
- Do not read `localStorage` or cookies in a server component.
- Do not add an abstraction that hides request errors; current code logs errors and renders the existing loading/error states.
- Keep timer ids inferred from `setInterval` or use `ReturnType<typeof setInterval>` when a nullable declaration is required.
