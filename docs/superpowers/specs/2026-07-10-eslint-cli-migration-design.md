# ESLint CLI Migration Design

## Goal

Restore a working lint command after Next.js 16 removed `next lint`.

## Design

Add `eslint.config.mjs` using the flat-config array exported by `eslint-config-next/core-web-vitals`. The installed Next 16.2.6 preset already includes its TypeScript rules, so no second TypeScript preset is added. A final `globalIgnores()` entry excludes `.next`, `out`, `build`, `dist-worker`, `.test-dist`, and `coverage` outputs.

Change `package.json` scripts to `eslint .` and `eslint . --fix`. Autofix remains opt-in. Run lint first, then make only the source edits necessary to remove real errors or warnings selected by the preset. Verification includes lint, tests, serial TypeScript checking, and the production build.
