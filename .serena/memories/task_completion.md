# Definition of Done

Before considering a coding task complete / opening a PR, run from repo root:

1. `pnpm type-check` — must pass.
2. `pnpm lint` — must pass (or `pnpm lint:fix` to auto-fix).
3. `pnpm format` — Prettier (also enforced by pre-commit on staged files).
4. `pnpm build` — must succeed (`main` must stay buildable).
5. If `@extension/block-engine` (or other Vitest-enabled pkg) gets created: run its unit tests (target 90% coverage). **Not available yet** — Vitest not installed.
6. Manual check: load `dist/` into Chrome (`chrome://extensions` → Load unpacked) and verify the feature (e.g. warning level B/C, global ON/OFF passthrough).
7. For UI/flow changes affecting E2E: `pnpm e2e` (WebDriverIO; add scenarios under `tests/e2e/specs/`).

pre-commit (Husky + lint-staged) auto-runs `prettier --write` + `eslint --fix` on staged `*.{js,jsx,ts,tsx,json}`, but do not rely on it alone — run the full checks above.

CI (`.github/workflows/`) runs lint/prettier/build; keep them green.
