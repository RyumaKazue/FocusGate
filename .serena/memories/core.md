# FocusGate — Core Source Map

**What it is**: A focus-support **Chrome extension (Manifest V3)** called **FocusGate** that gates access to distracting sites (YouTube/SNS) with a configurable deterrent level. Local-only (`chrome.storage.local`), no backend.

**Critical context**: This repo is a fork of [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite) v0.5.0 (pnpm + Turborepo + React 19 monorepo). **FocusGate feature code is NOT yet implemented** — the working tree is still mostly boilerplate (e.g. `chrome-extension/src/background/index.ts` and `pages/popup/src/Popup.tsx` are the original boilerplate samples referencing `exampleThemeStorage`). The design lives entirely in `docs/` (authoritative spec, written in Japanese).

## Authoritative design docs (`docs/`) — read these before implementing
- `docs/product-requirements.md` — PRD: features (block-list mgmt, warning levels B/C, global+per-site ON/OFF, local persistence, popup+options UI), KPIs, scope.
- `docs/architecture.md` — tech stack, layering, performance budgets, MV3 constraints, permissions.
- `docs/repository-structure.md` — exactly where each planned FocusGate component goes in the monorepo.
- `docs/functional-design.md` — component-level design (BlockEngine, DomainNormalizer, SettingsRepository, etc.).
- `docs/development-guidelines.md` — coding rules, git/commit conventions, testing, CI.
- `docs/glossary.md` — domain terms (follow these in naming).
- `docs/mvp-implementation-plan.md` — MVP build plan (untracked at onboarding).

## Planned FocusGate architecture (per docs — not yet built)
- `@extension/block-engine` (NEW package): pure block-decision logic (`BlockEngine.decide`/`matchSite`, `DomainNormalizer`), plus shared types/constants (`FocusGateSettings`, `WarningLevel='B'|'C'`, `DEFAULT_SETTINGS`, `STORAGE_KEY`). **Lowest layer: no `chrome.*`, no other `@extension/*` deps.**
- `packages/storage/lib/impl/focusgate-settings-storage.ts` (NEW): `createStorage<FocusGateSettings>(...)` settings store + helper fns (`addSite`/`updateSite`/`removeSite`). All settings access goes through here.
- `chrome-extension/src/background/navigation.ts` (NEW): `chrome.webNavigation` monitoring → BlockEngine → level C redirect (`onBeforeNavigate` → `chrome.tabs.update` to `blocked.html`) / level B overlay (`onCompleted` → content-ui message).
- `chrome-extension/public/blocked.html` (NEW): level-C block screen (`web_accessible_resources`).
- `manifest.ts`: **must add `webNavigation` permission** (currently missing) + register `blocked.html`.
- UI: `pages/popup` (global/level/per-site toggles), `pages/options` (block list CRUD), `pages/content-ui` (level-B Shadow-DOM overlay).

## Dependency rule (strict)
`pages/*` & `background` → `@extension/block-engine` (pure) ; → `@extension/storage` → `chrome.storage.local`. `storage` may depend on `block-engine` *types* only; never the reverse. UI/background **must not** touch `chrome.storage` directly. Cross-context (SW/pages/content) talk via `chrome.runtime` messaging + storage `liveUpdate` (onChanged), never direct import.

## Further memories
- Stack & versions: `mem:tech_stack`
- Monorepo layout & where things live: `mem:repo_layout`
- Commands (pnpm/turbo): `mem:suggested_commands`
- Code style & extension-specific conventions: `mem:conventions`
- Definition of done: `mem:task_completion`
