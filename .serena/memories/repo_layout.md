# Monorepo Layout

Workspaces (`pnpm-workspace.yaml`): `chrome-extension`, `pages/*`, `packages/*`, `tests/*`.

Placement rule:
- **Independently-loaded UI context** → `pages/<name>/` (React + Vite + Tailwind; each is `@extension/<name>`).
- **Logic/data/types reused across packages** → `packages/<name>/` (`@extension/<name>`).
- **Service Worker / manifest / whole-extension build** → `chrome-extension/`.

## `chrome-extension/`
- `manifest.ts` → emits `manifest.json`. Current `permissions`: storage, scripting, tabs, notifications, sidePanel; `host_permissions: ['<all_urls>']`. (FocusGate adds `webNavigation`.)
- `src/background/index.ts` — SW entry (currently boilerplate sample).
- `utils/plugins/make-manifest-plugin.ts`, `vite.config.mts`, `public/` (icons; content.css).

## `pages/` (each = `@extension/<name>`)
popup, options, new-tab, content, content-ui, content-runtime, devtools, devtools-panel, side-panel.
- FocusGate MVP uses: **popup, options, content-ui** (+ content/content-runtime for injection). Unused in MVP: side-panel, devtools, devtools-panel, new-tab.
- Page src pattern: `src/index.tsx` (mount) + `<Name>.tsx` (PascalCase component) + `<Name>.css`. Components are exported wrapped: `withErrorBoundary(withSuspense(Comp, <LoadingSpinner/>), ErrorDisplay)`.

## `packages/` (`@extension/*`)
- `storage` — `createStorage` abstraction (`lib/base/`, `lib/impl/`). Sample: `impl/example-theme-storage.ts`.
- `shared` — HOCs (`with-suspense`, `with-error-boundary`), hooks (`use-storage`), utils, `ManifestType`, consts (`PROJECT_URL_OBJECT`).
- `ui` — shared React components (`ToggleButton`, `LoadingSpinner`, `ErrorDisplay`) + `cn()` util + Tailwind merge (`with-ui`).
- `i18n` — typed `t()`; locale messages in `locales/{en,ko}/messages.json`.
- Infra: `hmr`, `env`, `vite-config`, `tailwindcss-config`, `tsconfig`, `dev-utils` (manifest-parser), `zipper`, `module-manager`.
- **`block-engine`** — NOT yet created; planned new pure-logic package (see `mem:core`).

## `tests/e2e/`
WebDriverIO: `config/wdio.*.conf.ts`, `specs/page-*.test.ts`, `helpers/`, `utils/`.

## Other
`.husky/` (pre-commit), `.github/workflows/` (CI), `bash-scripts/` (env + version), `docs/` (FocusGate spec — see `mem:core`), `.claude/` (skills/commands/agents for doc generation).

File-size guideline: prefer ≤300 lines; split SW logic into `background/navigation.ts` etc.
