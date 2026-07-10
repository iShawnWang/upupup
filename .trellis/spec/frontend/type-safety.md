# Type Safety

## Compiler baseline

TypeScript is configured with `strict: true`, `noEmit: true`, `isolatedModules: true`, bundler resolution, and the `@/*` path alias in `tsconfig.json`. Run `pnpm exec tsc --noEmit` after TypeScript changes.

## Domain and API contracts

- Define domain shapes as interfaces or literal unions near their boundary. Examples include `MonitorConfig` and `CheckRecord` in `lib/config.ts` and `lib/db.ts`, and `HistoryPoint`, `MonitorData`, and `DashboardResponse` in `app/api/dashboard/route.ts`.
- Use literal unions for finite status and locale values (`"up" | "down"`, `Locale`) rather than arbitrary strings.
- Reuse the exported `DashboardResponse` type in client consumers. The current page and dashboard view import it directly from `app/api/dashboard/route.ts`.
- Keep translation keys synchronized: add a key to `Translations` in `lib/i18n/types.ts` and to both `lib/i18n/zh.json` and `lib/i18n/en.json`.
- Use `Record<Locale, ...>` when all supported locales must be supplied, as in `lib/i18n/context.tsx` and `app/layout.tsx`.

## Props and utility types

- Prefer named props interfaces for feature components (`StatusCardProps`, `HistoryGridProps`).
- Use React-provided component prop types for generic UI wrappers, as in `components/ui/card.tsx` and `components/ui/dropdown-menu.tsx`.
- Use `VariantProps<typeof variants>` for `cva`-based component variants (`components/ui/button.tsx`, `components/ui/badge.tsx`).
- Keep nullability explicit for data that may not exist. API history fields use `number | null` and `string | null`, and the UI renders `—` or a fallback state.

The API contract uses literal unions and explicit nullable fields:

```ts
export interface HistoryPoint {
  time: string
  status: "up" | "down" | null
  latency_ms: number | null
  error: string | null
}
```

## Runtime validation

The project currently does not use Zod or another runtime schema library. Environment JSON is parsed in `lib/config.ts` and the API response is trusted after `res.ok` plus `res.json()`. If adding validation, keep it at the input boundary and do not scatter casts through presentation components.

## Known gaps and anti-patterns

- `components/status-card.tsx` uses `monitor: any` and `time_ranges?: any[]`; this is existing technical debt, not a preferred contract.
- `components/history-grid.tsx` uses `time_ranges?: any[]` even though its actual behavior only needs the selected range map; avoid extending this untyped surface.
- `app/layout.tsx` casts the `x-locale` header to `Locale`; retain the fallback behavior and consider a type guard before adding more locale sources.
- Do not silence strictness with `as any`, non-null assertions, or broad index signatures when a domain type can express the contract.
