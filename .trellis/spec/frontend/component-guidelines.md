# Component Guidelines

## Client and server boundaries

Use `"use client"` at the top of a component only when it uses client hooks, browser APIs, or a client-only provider. Current examples include:

- `app/page.tsx` for `useEffect`, `useState`, and `localStorage`.
- `components/dashboard-view.tsx` for polling and selected-range state.
- `components/theme-provider.tsx` for the `next-themes` client provider.
- `components/ui/dropdown-menu.tsx` and `components/ui/hover-card.tsx` for Radix client primitives.

`app/layout.tsx` remains a server component and owns `headers()`, metadata, locale-derived `<html lang>`, and the provider boundary.

## Props and composition

- Define a named props interface for feature components, as in `StatusCardProps` and `HistoryGridProps`.
- Pass data down from the page-level owner. `DashboardView` owns `DashboardResponse` state and passes one typed `MonitorData` plus range selection to `StatusCard`; `StatusCard` passes the selected history map to `HistoryGrid`.
- Use stable domain keys for mapped components. `DashboardView` uses `monitor.name` and `HistoryGrid` currently uses the segment index because the API returns ordered buckets without a bucket id.
- Keep feature components focused on presentation and interaction. Database queries and monitor execution stay in `app/api/dashboard/route.ts` and `lib/`.
- Use semantic HTML and explicit button types for interactive elements. `HistoryGrid` renders each segment as `<button type="button">` and supplies an `aria-label`.

## Styling and UI primitives

- Use Tailwind utility classes in JSX and merge conditional classes with `cn` from `lib/utils.ts`.
- Reuse `Button`, `Badge`, `DropdownMenu`, and `HoverCard` from `components/ui/` instead of importing the underlying Radix primitive directly in feature code.
- For reusable variants, follow the existing `cva` pattern in `components/ui/button.tsx` and `components/ui/badge.tsx`; expose a typed `VariantProps`-based API.
- Keep global colors, radius, typography, and dark-mode tokens in `app/globals.css`. Avoid adding page-specific global CSS for a local layout.
- Use `lucide-react` icons consistently with the existing dashboard (`Activity`, `RefreshCcw`, `Globe2`, `Radio`, `Zap`, etc.).

Representative component shape from `components/dashboard-view.tsx`:

```tsx
export function DashboardView({ initialData }: { initialData: DashboardResponse }) {
  const [data, setData] = useState<DashboardResponse>(initialData)
  // page-owned state and composition stay here
}
```

Representative conditional styling from `components/status-card.tsx`:

```tsx
<div className={cn("rounded-2xl border", !isUp ? "border-red-500/20" : "border-border/40")}>
```

## Localization and display

- User-visible dashboard text goes through `useI18n()` and a key from `lib/i18n/types.ts`; dictionaries live in `lib/i18n/zh.json` and `lib/i18n/en.json`.
- Use locale-aware formatting for dates, as in `DashboardView` and `HistoryGrid`.
- Keep protocol/status labels that are intentionally technical (`HTTP`, `UP`, `DOWN`) as-is unless the product already localizes them.

## Avoid

- Do not introduce a global store for state owned by one page or card.
- Do not use `any` for feature props. Reuse API interfaces such as `MonitorData` and `HistoryPoint`, or define a narrow local interface.
- Do not bypass the shared `cn` helper with ad-hoc class concatenation when classes are conditional.
- Do not make a low-level UI primitive depend on dashboard data, i18n context, or server modules.
