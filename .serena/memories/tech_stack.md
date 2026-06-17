# Tech Stack

Monorepo: **pnpm 10.11.0 workspaces + Turborepo 2.5.x**. Node **>=22.15.1** (`.nvmrc` = 22.15.1; `corepack enable` recommended).

- **TypeScript 5.8.x** — strict via `packages/tsconfig/base.json` (root `tsconfig.json` extends it). `any` effectively banned (use `unknown` + narrowing).
- **React 19.1** — all UI pages.
- **Vite 6.3** — per-workspace build (`vite.config.mts` / `build.mts` per page). Custom HMR plugin `@extension/hmr`.
- **TailwindCSS 3.4** — shared via `@extension/tailwindcss-config`; class order handled by `prettier-plugin-tailwindcss`.
- **Chrome MV3** — manifest defined in TS: `chrome-extension/manifest.ts` (emits `manifest.json`). `@types/chrome` 0.0.323.
- Firefox is supported by the boilerplate (`pnpm dev:firefox`/`build:firefox`), but FocusGate MVP targets Chrome only.

Lint/format:
- **ESLint 9 flat config** at `eslint.config.ts` (typescript-eslint, react, react-hooks, jsx-a11y, tailwindcss, import-x). No `.eslintignore` — ignores live in the config.
- **Prettier 3.5** (`.prettierrc`) + `eslint-config-prettier`. Never hand-format.
- **Husky 9 + lint-staged 16**: pre-commit runs `prettier --write` then `eslint --fix` on `*.{js,jsx,ts,tsx,json}`.

Testing:
- **E2E: WebDriverIO** in `tests/e2e/` (`wdio.*.conf.ts`, `specs/*.test.ts`). Run via `pnpm e2e` (zips first).
- **Unit tests: NOT installed.** Plan is to add **Vitest** to `@extension/block-engine` (pure logic, target 90% coverage). No `pnpm test` script exists yet.

Internal packages are named `@extension/<kebab-case>`; cross-refs use `"workspace:*"`. Commit `pnpm-lock.yaml` (not `package-lock.json`).

Build/env note: `pnpm dev`/`build` run `set-global-env` (bash) first; env handling lives in `packages/env` + `bash-scripts/` (`copy_env.sh`, `set_global_env.sh`). `postinstall` runs `copy-env`. Env vars are `CEB_*` / `CLI_CEB_*` (see `turbo.json` globalEnv).
