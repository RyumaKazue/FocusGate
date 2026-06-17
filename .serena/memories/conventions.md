# Conventions

Full rules: `docs/development-guidelines.md`. Key durable points:

## Naming
- Variables/functions: camelCase (functions verb-first). Constants: UPPER_SNAKE_CASE (`DEFAULT_SETTINGS`, `STORAGE_KEY`). Booleans: `is`/`has`/`should`.
- **File names: kebab-case for logic/util/type modules** (`block-engine.ts`, `domain-normalizer.ts`, `focusgate-settings-storage.ts`, `types.ts`, `constants.ts`). **PascalCase for React components** (`Popup.tsx`); entries are `index.tsx`/`index.ts`.
- Types: no `I` prefix on interfaces. Internal packages `@extension/<kebab-case>`, refs `workspace:*`.
- Follow `docs/glossary.md` for domain terms; avoid abbreviations.

## TypeScript / style
- `any` effectively banned → `unknown` + narrowing. Strict mode (inherits `packages/tsconfig/base.json`).
- Never hand-format; Prettier owns formatting, ESLint owns lint. Tailwind class order via `prettier-plugin-tailwindcss`.
- TSDoc (`/** */`) on public functions; inline comments explain **why**, not what.

## Chrome-extension-specific (enforced architectural rules)
- **Settings access only via `@extension/storage`** — never call `chrome.storage` directly from UI/background.
- **Cross-context comms** via `chrome.runtime` messaging + storage `liveUpdate` (onChanged). No direct import across SW/pages/content; share only through `@extension/*`.
- **`@extension/block-engine` stays pure** — no `chrome.*`, no other `@extension/*` deps; takes settings as args (lowest layer).
- **SW is non-persistent**: treat `@extension/storage` as source of truth; rebuild in-memory cache on startup; if cache null on navigation, `await get()` once.
- XSS: use React standard rendering, no `dangerouslySetInnerHTML`; content-ui overlay uses Shadow DOM (`init-app-with-shadow`). No `eval`/inline script (MV3 CSP).
- Block-decision failures (e.g. URL parse error) fail **open** (do NOT block) to avoid false blocks. Validation errors → `ValidationError` class, converted to friendly UI messages.
- Performance: keep storage sync I/O off the navigation critical path (use cache). Keep popup init light (200ms budget).

## React page pattern
Export default = `withErrorBoundary(withSuspense(Component, <LoadingSpinner />), ErrorDisplay)`. Read storage via `useStorage(someStorage)` hook from `@extension/shared`. Use `cn()` + `t()` (i18n) from `@extension/ui`/`@extension/i18n`.

## Git
- `main` always buildable. Topic branches: `feature/*`, `fix/*`, `refactor/*`. Squash merge preferred.
- **Conventional Commits**: `<type>(<scope>): <subject>`. Types: feat/fix/docs/style/refactor/test/chore. Scopes: engine/storage/popup/options/content-ui/background/manifest/deps/ci. Commit messages are written in Japanese (see git history).
