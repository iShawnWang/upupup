# Directory Structure

## Current layout

This is a single Next.js repository. The top-level structure is organized by runtime responsibility:

```text
app/
  layout.tsx              # Root server layout, metadata, theme provider
  page.tsx                # Client dashboard entrypoint
  globals.css             # Tailwind/shadcn theme and global styles
  api/dashboard/route.ts  # Server API route and response contract
components/
  dashboard-view.tsx      # Dashboard state, polling, and page composition
  status-card.tsx         # Monitor summary presentation
  history-grid.tsx        # History visualization and hover details
  theme-toggle.tsx        # Theme client control
  language-toggle.tsx     # Locale client control
  theme-provider.tsx      # next-themes adapter
  ui/                     # shadcn/Radix-style reusable primitives
lib/
  config.ts               # Environment parsing and defaults
  db.ts                   # SQLite connection/schema/queries
  checker.ts              # Monitor execution and persistence boundary
  cron.ts                 # Server scheduler lifecycle
  i18n/                   # Locale types, context, and JSON translations
  time-ranges.ts          # Shared history-range constants
  utils.ts                # Small shared utilities such as cn()
instrumentation.ts        # Server startup hook
proxy.ts                  # Request locale header middleware
```

The structure is demonstrated in `README.md` and matches the import paths used throughout the application.

## Placement rules

- Put route handlers and route-specific response types in the matching `app/**/route.ts` file. The dashboard contract is defined in `app/api/dashboard/route.ts` and imported by `app/page.tsx` and `components/dashboard-view.tsx`.
- Put page-level composition and page-owned state in `components/dashboard-view.tsx`, not in the low-level cards.
- Put reusable visual primitives in `components/ui/`. Existing primitives wrap Radix or native elements and use `cn` for class merging.
- Put feature components directly in `components/` while the repository remains small. There are no feature subdirectories or barrel exports today.
- Put cross-component constants and domain helpers in `lib/` (`lib/time-ranges.ts`, `lib/utils.ts`). Put server-only monitoring and database logic in the same directory, and do not import those modules into a client component.
- Keep translations in `lib/i18n/` and translation dictionaries in `lib/i18n/*.json`.
- Static images and other public assets belong in `public/`.

## Common mistakes

- Do not add a second `src/` tree or a parallel `pages/` router; this repository uses the root `app/` router.
- Do not place database access, `process.env` parsing, `node-cron`, or `better-sqlite3` imports in `components/` or modules marked `"use client"`.
- Do not put one-off dashboard layout code into `components/ui/`; keep generic primitives there and feature composition in the feature component.
