# State Management

## Local component state

Use React state for state that belongs to one page or control:

- `app/page.tsx` owns the initial `data` and `loading` state.
- `components/dashboard-view.tsx` owns the current `DashboardResponse` and `selectedRangeId`.
- `components/theme-toggle.tsx` owns only its hydration `mounted` flag.

Derive values with `useMemo` only when the existing pattern benefits from it; `DashboardView` derives the up/down/total summary from `data.monitors`.

## Context state

Use React Context for cross-cutting client state that several descendants consume. The current example is `I18nProvider` in `lib/i18n/context.tsx`, which exposes the locale, setter, translation function, and locale metadata. The root layout hosts `ThemeProvider` from `next-themes` for theme state.

Do not introduce Redux, Zustand, or another global store: none is installed or used in `package.json` or the source tree.

## Server data

The dashboard API is the server-data boundary:

1. `app/api/dashboard/route.ts` reads environment monitor configuration and SQLite history.
2. It returns the typed `DashboardResponse` shape, including `time_ranges` and pre-aggregated `history_points`.
3. `app/page.tsx` fetches the initial response.
4. `components/dashboard-view.tsx` refreshes the selected range every 30 seconds and replaces its local response.

Use native `fetch` with `cache: "no-store"`, check `res.ok`, and retain the existing loading/error fallback behavior. There is no server cache or client query cache.

## Persistence

- Selected history range is persisted in `localStorage` under `upupup-selected-range` (`app/page.tsx`, `components/dashboard-view.tsx`). Validate the stored id against `data.time_ranges` before using it.
- Locale is persisted in the `upupup-locale` cookie by `setLocaleCookie` in `lib/i18n/context.tsx`. `proxy.ts` reads it and forwards `x-locale` to server rendering.
- Theme is managed by `next-themes`; `components/theme-toggle.tsx` also explicitly writes the `theme` key to `localStorage`.
- Monitor configuration and history are server-side environment variables and SQLite, not client state (`lib/config.ts`, `lib/db.ts`).

## Avoid

- Do not duplicate the same dashboard response in multiple independent stores.
- Do not use `localStorage` as a substitute for server history or configuration.
- Do not access SQLite, environment variables, or cron state from client components.
- Do not assume a persisted locale/range is valid; use the validation/fallback behavior already present.
