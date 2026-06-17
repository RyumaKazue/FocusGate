# Commands

Run from repo root; `pnpm <script>` fans out to workspaces via Turbo. **Use pnpm, never npm/yarn.**

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install (runs `copy-env` postinstall) |
| `pnpm dev` | Watch build for Chrome → `dist/` (load unpacked from `dist/`) |
| `pnpm dev:firefox` | Watch build for Firefox |
| `pnpm build` | Production build → `dist/` |
| `pnpm build:firefox` | Production Firefox build |
| `pnpm zip` | build + zip → `dist-zip/` |
| `pnpm e2e` | WebDriverIO E2E (runs `zip` then `turbo e2e`) |
| `pnpm type-check` | `turbo type-check` across workspaces |
| `pnpm lint` / `pnpm lint:fix` | ESLint (`--continue`) |
| `pnpm format` | Prettier (cached) |
| `pnpm module-manager` | enable/disable boilerplate modules |
| `pnpm update-version <v>` | bump extension version (bash script) |
| `pnpm clean` | clean bundle + turbo + node_modules |

Scope to one workspace: `pnpm -F <name> <script>` (name w/o `@extension/` prefix works, e.g. `pnpm -F popup ...`).
Add dep: root → `pnpm i <pkg> -w`; workspace → `pnpm i <pkg> -F <name>`.

No `pnpm test` yet (Vitest not installed — see `mem:tech_stack`).

Loading the built extension: `chrome://extensions` → Developer mode → Load unpacked → select `dist/`.

Platform = **Darwin (macOS)**, zsh. Standard unix utils behave normally; nothing macOS-specific worth special-casing here.
