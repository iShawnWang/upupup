# ESLint CLI Migration Design

## Goal

Restore a working lint command after Next.js 16 removed `next lint`.

## Design

Add `eslint.config.mjs` using the flat-config arrays exported by `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. The latter adds the TypeScript-specific recommended rule set documented by Next.js. A final `globalIgnores()` entry excludes `.next`, `out`, `build`, `dist-worker`, `.test-dist`, and `coverage` outputs.

Change `package.json` scripts to `eslint .` and `eslint . --fix`. Autofix remains opt-in. Run lint first, then make only the source edits necessary to remove real errors or warnings selected by the preset. Verification includes lint, tests, serial TypeScript checking, and the production build.
