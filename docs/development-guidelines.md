# 開発ガイドライン (Development Guidelines)

本書は FocusGate(Chrome 拡張機能・Manifest V3)開発のコーディング規約と開発プロセスを定義する。

> **重要**: 本リポジトリは [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite)(v0.5.0)ベースの **pnpm + Turborepo + React 19** モノレポである。本書はボイラープレートの実ツールチェーンを前提とする。技術スタックは [アーキテクチャ設計書](./architecture.md)、構造は [リポジトリ構造定義書](./repository-structure.md) を参照。

## コーディング規約

### 命名規則

#### 変数・関数(TypeScript)
```typescript
// ✅ 良い例
const normalizedDomain = normalizeDomain(input);
function decideBlock(url: string, settings: FocusGateSettings): BlockDecision { }
const isGloballyEnabled = settings.globalEnabled;

// ❌ 悪い例
const d = norm(input);
function check(u: string, s: any): any { }
```
- 変数: camelCase / 関数: camelCase・動詞始まり / 定数: UPPER_SNAKE_CASE(`DEFAULT_SETTINGS`, `STORAGE_KEY`)。
- Boolean: `is`/`has`/`should` 始まり。略語を避け [用語集](./glossary.md) に沿う。

#### ファイル名(ボイラープレート慣習)
- **ロジック/ユーティリティ: kebab-case**(`block-engine.ts`, `domain-normalizer.ts`, `focusgate-settings-storage.ts`)。
- **React コンポーネント: PascalCase**(`Popup.tsx`)、エントリは `index.tsx` / `index.ts`。
- 型・定数モジュール: kebab-case(`types.ts`, `constants.ts`)。

#### 型・パッケージ
```typescript
type WarningLevel = 'B' | 'C';
interface FocusGateSettings { /* ... */ }   // I接頭辞は付けない
```
- 内部パッケージは `@extension/<kebab-case>`(例: `@extension/block-engine`)。参照は `workspace:*`。

### コードフォーマット
- **言語**: TypeScript。`any` 原則禁止(必要時 `unknown` + 絞り込み)。`tsconfig` は `packages/tsconfig/base.json` を継承。
- **整形/解析**: Prettier(`.prettierrc`)+ ESLint フラット設定(`eslint.config.ts`)。手動整形しない。
- **ESLint との競合回避**: `eslint-config-prettier` 導入済み。フォーマットは Prettier に委譲。
- **React/Tailwind**: `eslint-plugin-react` / `react-hooks` / `jsx-a11y` / `tailwindcss` が有効。クラス順序は `prettier-plugin-tailwindcss` に委譲。

### Chrome 拡張機能 固有の規約
- **設定アクセスは `@extension/storage` 経由に限定**。UI/background から `chrome.storage` を直接呼ばない。
- **コンテキスト間通信はメッセージング / `liveUpdate`(onChanged)**。コンテキストを跨いだ直接 import はしない(`@extension/*` のみ共有可)。
- **`BlockEngine` は純粋関数に保つ**。`chrome.*` を参照せず、設定を引数で受け取る。`@extension/block-engine` は他パッケージにも依存しない(最下層)。
- **XSS 対策**: React の標準レンダリングを使い `dangerouslySetInnerHTML` を避ける。content-ui は Shadow DOM で分離。
- **`eval` / インライン script を使わない**(MV3 CSP)。
- **Service Worker は停止前提**。状態を `@extension/storage` を真実の源とし起動時にキャッシュ再構築。

### コメント規約(TSDoc)
```typescript
/**
 * URL と現在の設定からブロック要否・警告レベルを判定する。
 * @param url - 遷移先 URL(http/https 以外は対象外)
 * @param settings - 現在の FocusGate 設定
 * @returns ブロック判定結果
 */
function decide(url: string, settings: FocusGateSettings): BlockDecision { /* ... */ }
```
インラインコメントは「なぜ」を説明する(「何を」はコードで分かる)。

### エラーハンドリング
- 予期されるエラー(不正入力・重複)は `ValidationError` で表現し、UI で平易なメッセージへ変換。
- 判定系の失敗(URL 解析失敗など)は「ブロックしない」側に倒し誤ブロックを防ぐ。
- エラーを握りつぶさない(最低限ログ)。内部詳細をユーザーに露出しない。

```typescript
// 配置先: packages/block-engine/lib/validation-error.ts(または @extension/block-engine 内)
class ValidationError extends Error {
  constructor(message: string, public field: string, public value: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

## Git運用ルール

### ブランチ戦略
`main` + 短命トピックブランチ。
- `main`: 常にビルド可能(`pnpm build` が通る)状態。
- `feature/[機能名]`(例: `feature/block-engine`)/ `fix/[修正]` / `refactor/[対象]`。
- **マージ方式**: Squash merge を推奨(トピックの WIP コミットを1つに集約し、main を Conventional Commits 単位に揃える)。

### コミットメッセージ規約(Conventional Commits)
```
<type>(<scope>): <subject>
```
- **Type**: `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`
- **Scope の例**: `engine` / `storage` / `popup` / `options` / `content-ui` / `background` / `manifest` / `deps` / `ci`
  - `chore(deps)`: 依存更新 / `chore(ci)`: CI 変更 / `refactor(engine)`: BlockEngine 改修

```
feat(engine): ドメイン部分一致によるブロック判定を実装

youtube.com 登録時に m.youtube.com 等のサブドメインも対象とする部分一致を追加。

Closes #12
```

### プルリクエストプロセス
**作成前チェック**:
- [ ] `pnpm type-check` パス
- [ ] `pnpm lint` パス
- [ ] (ユニットテスト導入後)対象パッケージのテストがパス
- [ ] `pnpm build` 成功
- [ ] 拡張機能を Chrome に読み込み、対象機能の手動動作確認済み

**PRテンプレート**(`.github/pull_request_template.md` として配置推奨):
```markdown
## 概要 / ## 変更理由 / ## 変更内容
## テスト
- [ ] ユニット/E2E 追加・更新
- [ ] 手動テスト(警告レベルB/C、全体ON/OFF 等)
## 関連Issue
Closes #
```

## テスト戦略

> **現状**: ボイラープレートのテストは **E2E(WebDriverIO)のみ**。ユニットテスト基盤(Vitest)は**未導入**。純粋ロジックの品質担保のため Vitest の追加を推奨する。

### ユニットテスト(★ 追加推奨)
- **対象**: `@extension/block-engine`(`BlockEngine.decide` / `matchSite`、`DomainNormalizer`)。
- **フレームワーク**: Vitest を `packages/block-engine` に追加(`vitest` devDependency + `test` スクリプト + `turbo.json` に `test` タスク)。
- **カバレッジ目標**: `@extension/block-engine` で 90% 以上(`vitest --coverage`、`coverage/` 出力)。
- **命名規則**: `[対象]_[条件]_[期待結果]`。

```typescript
describe('BlockEngine.decide', () => {
  it('globalDisabled_returnsNotBlocked', () => { /* ... */ });
  it('subdomain_matchesRegisteredDomain', () => { /* m.youtube.com */ });
  it('lookalikeDomain_doesNotMatch', () => { /* notyoutube.com */ });
});
```

### E2Eテスト(既存基盤)
- **ツール**: WebDriverIO(`tests/e2e/`、`wdio.*.conf.ts`)。実行は `pnpm e2e`(`pnpm zip` 後に `turbo e2e`)。
- **対象**: `tests/e2e/specs/` に FocusGate シナリオを追加(レベルB/C、全体OFF素通し)。既存 `page-popup.test.ts` 等のパターンに倣う。

### モック・スタブ
- ユニットでは `chrome.*` をモック(`vi.stubGlobal('chrome', chromeMock)`)。ただし `BlockEngine` は純粋関数のため `chrome` モック不要で、設定オブジェクトを直接渡してテストする。

## コードレビュー基準

**機能性**: 要件([PRD](./product-requirements.md))充足 / エッジケース(非httpスキーム、サブドメイン、類似ドメイン、空入力)/ 誤ブロック防止。
**保守性**: レイヤー責務(`block-engine` の純粋性、`chrome.storage` 直アクセス禁止、コンテキスト跨ぎ import 禁止)。
**パフォーマンス**: ナビゲーションのクリティカルパスで storage 同期I/Oをしない(キャッシュ参照)。
**セキュリティ**: 入力検証/正規化、`dangerouslySetInnerHTML`・`eval` 不使用、`webNavigation` 以外の権限を増やさない。

**コメント分類**: `[必須]`(バグ・セキュリティ・要件未達)/ `[推奨]` / `[提案]` / `[質問]`。建設的に、理由とともに記述する。

## 開発環境セットアップ

### 必要なツール
| ツール | バージョン | 備考 |
|--------|-----------|------|
| Node.js | 22.15.1(`.nvmrc`) | `nvm use` で固定 |
| pnpm | 10.11.0 | `corepack enable` 推奨 |
| Google Chrome | MV3 対応版 | |

### セットアップ手順
```bash
# 1. クローン & Node 固定
git clone [URL] && cd FocusGate
nvm use            # .nvmrc: 22.15.1

# 2. 依存インストール(pnpm)
pnpm install       # postinstall で .env を生成(copy-env)

# 3. 開発ビルド(監視)
pnpm dev           # dist/ を生成・監視(Chrome 用)
# Firefox: pnpm dev:firefox

# 4. Chrome に読み込む
#  chrome://extensions → デベロッパーモード ON
#  → 「パッケージ化されていない拡張機能を読み込む」→ dist/ を選択
```

### 主要 pnpm スクリプト(`package.json` 実在)
| スクリプト | 内容 |
|-----------|------|
| `pnpm dev` | 監視ビルド(Chrome、`dist/`) |
| `pnpm build` | 本番ビルド(`dist/`) |
| `pnpm zip` | ビルド + zip 化(`@extension/zipper`) |
| `pnpm e2e` | E2E(WebDriverIO。`zip` 後に実行) |
| `pnpm type-check` | 全ワークスペース型チェック(`turbo type-check`) |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test`(★追加予定) | Vitest ユニット(`block-engine` 追加後) |

### 推奨開発ツール
- VS Code: ESLint / Prettier / Tailwind CSS IntelliSense。
- Chrome 拡張管理画面: Service Worker「検証」でログ確認、リロードで再読み込み。

## 品質自動化(CI / pre-commit)

### pre-commit(Husky + lint-staged、既存)
`*.{js,jsx,ts,tsx,json}` に対し `prettier --write` → `eslint --fix` を実行(`package.json` の `lint-staged`)。

### CI(GitHub Actions)
- **設定**: `.github/workflows/`(既存ワークフローに準拠/追記)。
- **実行内容(推奨)**:
  1. `actions/setup-node`(`.nvmrc` の 22.15.1)+ `corepack` で pnpm 有効化
  2. `pnpm install --frozen-lockfile`
  3. `pnpm type-check`
  4. `pnpm lint`
  5. (導入後)`pnpm test`
  6. `pnpm build`
- いずれか失敗でマージをブロック。`pnpm-lock.yaml` をコミットし再現性を担保。

## 付記: 初版からの主な変更点
| 項目 | 初版(誤) | 本版(実態整合) |
|------|----------|----------------|
| パッケージ管理/コマンド | npm(`npm run ...`) | pnpm + Turbo(`pnpm dev/build/lint/type-check/e2e`) |
| UI | バニラ TS | React 19 + Tailwind |
| ユニットテスト | Vitest 前提 | 未導入(`block-engine` に追加推奨)。E2E は WebDriverIO |
| ストレージ規約 | `SettingsRepository` クラス経由 | `@extension/storage`(createStorage)経由 |
| ファイル名 | PascalCase クラス中心 | ロジックは kebab-case、React は PascalCase |
