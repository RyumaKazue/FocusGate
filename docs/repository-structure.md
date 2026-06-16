# リポジトリ構造定義書 (Repository Structure Document)

本書は FocusGate(Chrome 拡張機能・Manifest V3)のディレクトリ構造とファイル配置規則を定義する。

> **重要**: 本リポジトリは [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite)(v0.5.0)をベースにした **pnpm ワークスペース + Turborepo のモノレポ**である。本書は既存ボイラープレートの構造を前提とし、FocusGate 固有の追加実装をどこに配置するかを定義する。技術選定は [アーキテクチャ設計書](./architecture.md)、コンポーネントは [機能設計書](./functional-design.md) を参照。

## モノレポ構成の基本ルール

- **パッケージ管理**: pnpm(`pnpm-workspace.yaml`)。各ワークスペースは `@extension/<name>` で命名され、相互参照は `workspace:*`。
- **タスク実行**: Turborepo(`turbo.json`)。ルートの `pnpm <script>` が各ワークスペースの同名スクリプトを `turbo` で集約実行する。
- **配置の原則**:
  - **UI として独立ロードされるコンテキスト** → `pages/<name>/`(React + Vite)。
  - **複数パッケージから再利用するロジック・データ・型** → `packages/<name>/`(`@extension/<name>`)。
  - **Service Worker・manifest・拡張機能全体のビルド** → `chrome-extension/`。
- **ワークスペース対象**(`pnpm-workspace.yaml`): `chrome-extension`, `pages/*`, `packages/*`, `tests/*`。

## プロジェクト構造(現状 + FocusGate 追加)

`★` は FocusGate 実装で**新規追加**するもの、無印は既存ボイラープレートの構造。

```
FocusGate/
├── package.json               # ルート。pnpm scripts / turbo 集約
├── pnpm-workspace.yaml        # ワークスペース定義
├── pnpm-lock.yaml             # 依存ロック(pnpm)
├── turbo.json                 # Turborepo タスクパイプライン
├── tsconfig.json              # ルート TS 設定(packages/tsconfig を継承)
├── eslint.config.ts           # ESLint フラット設定
├── .prettierrc / .prettierignore
├── .nvmrc                     # Node バージョン(22.15.1)
├── .husky/                    # pre-commit(lint-staged)
├── .github/                   # CI ワークフロー
├── bash-scripts/              # env 生成・バージョン更新スクリプト
├── README.md
│
├── chrome-extension/          # 拡張機能本体(SW・manifest・ビルド統合)
│   ├── manifest.ts            # MV3 マニフェスト(TS で定義)
│   ├── vite.config.mts
│   ├── package.json           # @extension/... (拡張本体)
│   ├── public/                # アイコン等(icon-34.png, icon-128.png)
│   │   └── blocked.html       # ★ レベルC ブロック画面(web_accessible_resources)
│   ├── src/
│   │   └── background/
│   │       ├── index.ts       # Service Worker エントリ(既存)
│   │       └── navigation.ts  # ★ ナビゲーション監視・ブロック判定の振り分け
│   └── utils/
│
├── pages/                     # 各実行コンテキストの UI(React + Vite + Tailwind)
│   ├── popup/                 # @extension/popup — 全体ON/OFF・警告レベル・サービスON/OFF
│   │   └── src/
│   │       ├── index.tsx
│   │       ├── Popup.tsx      # ★ FocusGate のポップアップ UI に実装
│   │       └── Popup.css
│   ├── options/               # @extension/options — ブロックリスト追加/編集/削除
│   │   └── src/ ...           # ★ FocusGate のオプション UI に実装
│   ├── content/               # @extension/content — 静的 content script
│   ├── content-ui/            # @extension/content-ui — ★ レベルB 確認オーバーレイ(React + Shadow DOM)
│   ├── content-runtime/       # @extension/content-runtime — 動的注入 content script
│   ├── new-tab/               # @extension/new-tab(newtab override。FocusGate では未使用 or 流用検討)
│   ├── side-panel/ devtools/ devtools-panel/  # 本 MVP では未使用
│   └── ...
│
├── packages/                  # 共有ライブラリ(@extension/*)
│   ├── storage/               # @extension/storage — createStorage ストレージ抽象
│   │   └── lib/impl/
│   │       ├── example-theme-storage.ts          # 既存サンプル
│   │       └── focusgate-settings-storage.ts     # ★ FocusGate 設定ストレージ
│   ├── block-engine/          # ★ @extension/block-engine — ブロック判定の純粋ロジック
│   │   └── lib/
│   │       ├── block-engine.ts        # ★ BlockEngine(decide / matchSite)
│   │       ├── domain-normalizer.ts   # ★ DomainNormalizer(normalize / isValid)
│   │       ├── types.ts               # ★ FocusGateSettings, BlockSite, WarningLevel, BlockDecision
│   │       └── constants.ts           # ★ DEFAULT_SETTINGS, STORAGE_KEY
│   ├── shared/                # @extension/shared — 汎用 HOC/hooks/utils(React 寄り)
│   ├── ui/                    # @extension/ui — 共有 React コンポーネント + Tailwind
│   ├── i18n/                  # @extension/i18n — 多言語
│   ├── hmr/ env/ tsconfig/ vite-config/ tailwindcss-config/ dev-utils/ ...
│   └── ...
│
└── tests/
    └── e2e/                   # WebDriverIO E2E(既存)
        ├── config/wdio.*.conf.ts
        ├── specs/*.test.ts    # ★ FocusGate のシナリオを追加(警告レベル等)
        └── helpers/ utils/
```

## FocusGate 固有実装の配置決定

設計([機能設計書](./functional-design.md))のコンポーネントを、ボイラープレートのどこに置くかを定義する。

| 設計上のコンポーネント | 配置先 | 実現方法 |
|----------------------|--------|---------|
| 設定の永続化(機能設計の `SettingsRepository` 相当) | `packages/storage/lib/impl/focusgate-settings-storage.ts` | ボイラープレートの `createStorage<FocusGateSettings>(STORAGE_KEY, DEFAULT_SETTINGS, { storageEnum: Local, liveUpdate: true })` を使用。クラスではなくストレージオブジェクト + 補助関数(`addSite`/`updateSite`/`removeSite`)で表現 |
| `BlockEngine`(純粋判定ロジック) | `packages/block-engine/lib/block-engine.ts` | 新規パッケージ `@extension/block-engine`。`chrome.*` 非依存の純粋関数 |
| `DomainNormalizer` | `packages/block-engine/lib/domain-normalizer.ts` | 同上 |
| 型・定数(`FocusGateSettings` 等 / `DEFAULT_SETTINGS`, `STORAGE_KEY`) | `packages/block-engine/lib/types.ts`, `constants.ts` | storage と engine の双方から参照。循環回避のため型は engine 側に集約し storage が依存する |
| ナビゲーション監視・振り分け | `chrome-extension/src/background/navigation.ts` | Service Worker(`chrome.webNavigation` + `chrome.tabs`) |
| レベルB 確認オーバーレイ | `pages/content-ui/`(または `content-runtime/`) | React + Shadow DOM(`init-app-with-shadow` 利用) |
| レベルC ブロック画面 | `chrome-extension/public/blocked.html` + manifest `web_accessible_resources` | SW が `chrome.tabs.update` でリダイレクト |
| ポップアップ UI | `pages/popup/src/Popup.tsx` | 既存ページに実装 |
| オプション UI | `pages/options/src/` | 既存ページに実装 |

> **要確定事項**: `@extension/block-engine` を新規パッケージとして切るか、`chrome-extension/utils` 配下に置くかは実装開始時に確定する。純粋ロジックの**ユニットテスト容易性と再利用性**を重視し、本書では新規パッケージを推奨する。

## ディレクトリ詳細

### chrome-extension/

**役割**: MV3 マニフェスト定義、Service Worker、拡張機能全体のビルド統合。

**FocusGate での追加**:
- `src/background/navigation.ts`: `chrome.webNavigation` でナビゲーションを監視し、`@extension/block-engine` で判定。レベルCは `onBeforeNavigate` で `chrome.tabs.update` してブロック画面へ、レベルBは `onCompleted` で content-ui へメッセージ送信。
- `public/blocked.html`: レベルC のブロック画面。
- `manifest.ts`: **`permissions` に `webNavigation` を追加**(現状未宣言)。`web_accessible_resources` に `blocked.html` を追加。

**依存可能**: `@extension/block-engine`, `@extension/storage`, `@extension/shared`。

### pages/

**役割**: 各実行コンテキストの UI。各ページは独立した `@extension/<name>` パッケージで、React + Vite + Tailwind で実装。

**FocusGate で使用するページ**:
- `popup/`: 全体 ON/OFF・警告レベル(B/C)・サービス個別 ON/OFF。
- `options/`: ブロックリストの追加・編集・削除。
- `content-ui/`: レベルB の確認オーバーレイ(Shadow DOM で対象ページのスタイルと分離)。
- `content/` / `content-runtime/`: オーバーレイの注入方式に応じて利用(動的注入なら content-runtime)。

**未使用(MVP)**: `side-panel`, `devtools`, `devtools-panel`, `new-tab`(レベルCに流用する選択肢はあるが、本書では `blocked.html` を採用)。

**依存可能**: `@extension/block-engine`, `@extension/storage`, `@extension/ui`, `@extension/shared`, `@extension/i18n`。

### packages/

**役割**: 複数コンテキストから再利用される共有ライブラリ。

**FocusGate での追加・利用**:
- `storage/`(既存): `focusgate-settings-storage.ts` を追加。設定の読み書き・変更購読(`liveUpdate`)を担う。**全コンテキストはここを経由して設定にアクセス**し、`chrome.storage` を直接触らない。
- `block-engine/`(新規): ブロック判定・ドメイン正規化・型・定数。`chrome.*` 非依存。
- `shared/`, `ui/`, `i18n/`(既存): UI 補助・共有コンポーネント・多言語として利用。

**依存ルール**: `block-engine` は `chrome.*` にも他パッケージにも依存しない(最下層)。`storage` は `block-engine` の型に依存してよいが逆は不可。

### tests/

**役割**: E2E テスト。**現状は WebDriverIO(`tests/e2e/`)のみ**。

**FocusGate での追加**:
- `e2e/specs/` に警告レベルB/C・全体OFF素通し等のシナリオを追加。
- **ユニットテストは未導入**。純粋ロジック(`block-engine`)のユニットテストを行う場合は、`packages/block-engine` に Vitest を追加する(詳細は [開発ガイドライン](./development-guidelines.md))。

## ファイル配置規則

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| 純粋ロジック | `packages/block-engine/lib/` | kebab-case | `block-engine.ts`, `domain-normalizer.ts` |
| 型・定数 | `packages/block-engine/lib/` | kebab-case | `types.ts`, `constants.ts` |
| 設定ストレージ | `packages/storage/lib/impl/` | kebab-case + `-storage` | `focusgate-settings-storage.ts` |
| Service Worker ロジック | `chrome-extension/src/background/` | kebab-case | `index.ts`, `navigation.ts` |
| UI コンポーネント | `pages/<ctx>/src/` | PascalCase(コンポーネント)/ kebab-case(util) | `Popup.tsx`, `index.tsx` |
| ブロック画面 | `chrome-extension/public/` | kebab-case | `blocked.html` |
| E2E テスト | `tests/e2e/specs/` | kebab-case + `.test.ts` | `block-levels.test.ts` |
| ユニットテスト(追加時) | 各パッケージ内 `*.spec.ts` | 対象 + `.spec.ts` | `block-engine.spec.ts` |

## 命名規則

### ワークスペース / パッケージ
- パッケージ名は `@extension/<kebab-case>`(例: `@extension/block-engine`)。ボイラープレートの慣習に合わせる。
- 相互参照は `package.json` の `dependencies` に `"@extension/<name>": "workspace:*"`。

### ディレクトリ名
- `pages/` 配下: 単数・kebab-case(`popup`, `options`, `content-ui`)。
- `packages/` 配下: 単数・kebab-case(`storage`, `block-engine`)。

### ファイル名
- ボイラープレートの慣習に合わせ、ロジック/ユーティリティは **kebab-case**(`block-engine.ts`, `domain-normalizer.ts`, `focusgate-settings-storage.ts`)。
- React コンポーネントは **PascalCase**(`Popup.tsx`)、エントリは `index.tsx` / `index.ts`。

## 依存関係のルール

```
pages/* (UI)  ─┐
chrome-extension/src/background ─┤→ @extension/block-engine (純粋ロジック・最下層)
               └→ @extension/storage (createStorage) ─→ chrome.storage.local
                         │
                         └→ @extension/block-engine の型に依存(逆は不可)
```

**禁止される依存**:
- `@extension/block-engine` → `chrome.*` / 他 `@extension/*` への依存(❌ 純粋・最下層を保つ)
- UI / background → `chrome.storage` 直接アクセス(❌ 必ず `@extension/storage` 経由)
- `@extension/storage` → `pages/*` や `chrome-extension` への依存(❌)

**コンテキスト間通信**: 実行コンテキスト(SW / pages / content)は直接 import できない。連携は `chrome.runtime` メッセージングと `chrome.storage` の `liveUpdate`(onChanged)で行う。共有コードは `@extension/*` の import で再利用。

**循環依存の回避**: 型・定数は `@extension/block-engine/lib/types.ts`・`constants.ts` に集約し、`storage` も engine も同じ型を参照することで循環を防ぐ。

## スケーリング戦略

### Post-MVP 機能の配置指針
- **スケジュール機能**: `@extension/block-engine` に時間条件の判定ステップを追加 + `FocusGateSettings` に schedule フィールド追加(`version` マイグレーション)。
- **設定同期**: `focusgate-settings-storage.ts` の `storageEnum` を `Sync` に変更/併用(配置変更不要)。
- **パス単位ブロック**: `block-engine` の `matchSite` 拡張 + `BlockSite` 型へパス条件追加。
- **回数記録・可視化**: 記録用ストレージを `packages/storage` に追加し、可視化 UI を `pages/` に新規ページとして追加(manifest にエントリ登録)。

### ファイルサイズの管理
- 1ファイル 300行以下を推奨。`background/index.ts` が肥大化したら `navigation.ts` 等へ責務分割。

## 特殊ディレクトリ

### .github/ / .husky/ / bash-scripts/
- `.github/`: CI ワークフロー(既存)。
- `.husky/`: pre-commit で lint-staged(`prettier --write` + `eslint --fix`)を実行(既存)。
- `bash-scripts/`: env 生成(`copy_env.sh` / `set_global_env.sh`)・バージョン更新(`update_version.sh`)。

### .claude/ (Claude Code設定)
```
.claude/
├── commands/  ├── skills/  ├── agents/  └── settings.json
```

## 除外設定(現状の .gitignore に準拠)

```
**/node_modules
**/coverage
**/dist  **/build  **/dist-zip
chrome-extension/manifest.js
**/.turbo
**/.env  **/.env.*
.DS_Store  .idea
**/tailwind-output.css
```

> ロックファイルは `pnpm-lock.yaml`(`package-lock.json` ではない)をコミットする。ESLint はフラット設定(`eslint.config.ts`)を使用し、`.eslintignore` は存在しない(ignore は設定内 `ignores` で表現)。
