# Frontend Development Guidelines

These guidelines describe the conventions currently used by this single-repository Next.js application. They are based on the code in `app/`, `components/`, and `lib/`; update them when the repository adopts a new pattern.

## Stack and boundaries

- Next.js 16 App Router with React 19 and TypeScript 5.9 (`package.json`).
- Route files live under `app/`; reusable UI lives under `components/`; configuration, data access, monitoring, and shared helpers live under `lib/`.
- Tailwind CSS v4, shadcn/Radix primitives, `lucide-react`, and `next-themes` are the established UI stack (`components.json`, `app/globals.css`).
- The application has server-side monitoring code as well as client-side dashboard code. Keep server-only database, environment, cron, and fetch-checking logic out of client components.

## Pre-development checklist

Before changing frontend code:

1. Read the applicable guide below and inspect the nearest existing example.
2. Decide whether the change belongs in an App Router entrypoint, a reusable component, a UI primitive, or `lib/`.
3. Preserve the existing client/server boundary. Add `"use client"` only when the module uses browser APIs, React client hooks, or client-only providers.
4. Reuse `cn` and the existing UI primitives before adding a new styling or component abstraction.
5. Keep user-facing strings in `lib/i18n/*.json` and access them through `useI18n` when the surrounding feature is localized.
6. Run `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` for changes that affect application code.

## Quality check

For frontend changes, review [Quality Guidelines](./quality-guidelines.md) and verify:

- The applicable TypeScript check and production build pass.
- `pnpm lint` is attempted; if it fails because the current `next lint` script or ESLint configuration is missing, record that repository tooling issue explicitly.
- New interactive elements retain semantic markup, keyboard/focus behavior, and accessible labels.
- New user-facing strings are present in both locale dictionaries.
- No new `any`, uncleaned timers, client/server boundary violations, or template text are introduced.

## Guides

| Guide | Use it for |
|---|---|
| [Directory Structure](./directory-structure.md) | Choosing a location and understanding runtime boundaries |
| [Component Guidelines](./component-guidelines.md) | Component props, composition, UI primitives, and client boundaries |
| [Hook Guidelines](./hook-guidelines.md) | Effects, polling, browser persistence, and context hooks |
| [State Management](./state-management.md) | Local state, context, server data, cookies, and localStorage |
| [Type Safety](./type-safety.md) | TypeScript shapes, API contracts, and current legacy gaps |
| [Quality Guidelines](./quality-guidelines.md) | Validation, accessibility, logging, and known test coverage |

## Shared project guides

General reasoning and workflow guidance is in [`../guides/index.md`](../guides/index.md). These frontend documents add repository-specific rules; they do not replace the shared guides.
