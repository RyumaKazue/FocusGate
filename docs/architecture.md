# 技術仕様書 (Architecture Design Document)

本書は FocusGate(Chrome 拡張機能・Manifest V3)の技術構造・技術選定・非機能特性を定義する。

> **重要**: 本リポジトリは [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite)(v0.5.0)をベースにした **pnpm + Turborepo モノレポ**である。技術スタックはボイラープレートの採用技術を前提とする。要件は [PRD](./product-requirements.md)、コンポーネントは [機能設計書](./functional-design.md)、配置は [リポジトリ構造定義書](./repository-structure.md) を参照。

## テクノロジースタック

### 言語・ランタイム

| 技術 | バージョン | 備考 |
|------|-----------|------|
| TypeScript | 5.8.x | `strict` 系は `packages/tsconfig/base.json` を継承 |
| Node.js(ビルド環境) | 22.15.1(`.nvmrc`) | `engines.node >=22.15.1` |
| pnpm | 10.11.0(`packageManager`) | ワークスペース管理 |
| Chrome 拡張仕様 | Manifest V3 | `chrome-extension/manifest.ts` で定義 |
| 対象ブラウザ | Google Chrome(最新+1つ前)/ Firefox(ボイラープレートが対応、MVPでは Chrome を主対象) | |

### フレームワーク・ライブラリ(ボイラープレート採用技術)

| 技術 | バージョン | 用途 | 備考 |
|------|-----------|------|------|
| React | 19.1.x | 各 UI(popup/options/content-ui 等) | ボイラープレートが採用済み。FocusGate も React で UI を実装する |
| Vite | 6.3.x | 各ワークスペースのビルド | ページ単位の `vite.config.mts` |
| Turborepo | 2.5.x | モノレポのタスクパイプライン | `turbo.json` |
| TailwindCSS | 3.4.x | UI スタイリング | `@extension/tailwindcss-config` で共有 |
| @types/chrome | 0.0.323 | Chrome API 型 | |

> **設計判断の更新**: 初版では「軽量優先で UI フレームワーク不採用(バニラ TS)」としていたが、**実リポジトリは React 19 をボイラープレートとして採用済み**である。スクラッチでバニラ化するコストとボイラープレートの HMR・ページ分割の恩恵を比較し、**React を採用する**方針に改める。ポップアップ 200ms 要件は、ポップアップを軽量に保つ(重い初期化を避ける・必要な storage のみ読む)ことで担保する。

### 開発ツール

| 技術 | バージョン | 用途 |
|------|-----------|------|
| ESLint | 9.27.x(フラット設定 `eslint.config.ts`) | 静的解析(typescript-eslint, react, jsx-a11y, tailwindcss, import-x) |
| Prettier | 3.5.x(`eslint-config-prettier` 併用) | フォーマット |
| Husky + lint-staged | 9.x / 16.x | pre-commit で `prettier --write` + `eslint --fix` |
| WebDriverIO | `tests/e2e/` | E2E テスト(既存) |
| Vitest | ★ 未導入(追加提案) | 純粋ロジック(`@extension/block-engine`)のユニットテスト用に追加を推奨 |

## アーキテクチャパターン

### 全体構造: モノレポ + 実行コンテキスト分離 + レイヤード

Chrome 拡張は複数の独立した実行コンテキスト(Service Worker / 各 UI ページ / Content Script)で動作する。共有ロジックは `packages/*`(`@extension/*`)に集約し、各コンテキストから import で再利用する。

```
┌──────────────────────────────────────────────────────────────┐
│ 実行コンテキスト(ブラウザが分離管理)                           │
│  [Service Worker]   [popup]  [options]  [content-ui]         │
│  chrome-extension    pages/    pages/      pages/             │
│   /src/background                                            │
└───────────┬───────────┬─────────┬────────────┬──────────────┘
            ▼           ▼         ▼            ▼
┌──────────────────────────────────────────────────────────────┐
│ 共有パッケージ (packages/*)                                    │
│  @extension/block-engine          @extension/storage         │
│  ┌──────────────┬───────────────┐ ┌────────────────────────┐ │
│  │ BlockEngine  │ DomainNormalizer│ │ focusgate-settings-     │ │
│  │ (純粋ロジック) │ + types/const  │ │ storage (createStorage) │ │
│  └──────────────┴───────────────┘ └───────────┬────────────┘ │
└───────────────────────────────────────────────┼──────────────┘
                                                ▼
                                  ┌────────────────────────┐
                                  │  chrome.storage.local  │
                                  └────────────────────────┘
```

### レイヤーの責務と依存ルール

```
UI(pages/*) / background → @extension/block-engine(判定) 
                         → @extension/storage(永続化) → chrome.storage.local
```

- **UIレイヤー(pages/popup, options, content-ui)**: ユーザー入力・状態表示・警告オーバーレイ描画(React)。`@extension/storage` 経由で設定を読み書きし、`chrome.storage` を直接触らない。
- **サービスレイヤー(@extension/block-engine + background)**: ブロック判定(純粋関数)、ナビゲーション監視と振り分け。
- **データレイヤー(@extension/storage)**: `createStorage` による永続化・変更購読(`liveUpdate`)。
- **依存方向**: `block-engine`(最下層・`chrome.*` 非依存)← `storage`(型のみ依存)← UI/background。逆方向は禁止。

## データ永続化戦略

### ストレージ方式

| データ種別 | ストレージ | 実現方法 |
|-----------|----------|---------|
| 全設定(globalEnabled / warningLevel / sites) | `chrome.storage.local` | ボイラープレートの `createStorage<FocusGateSettings>(STORAGE_KEY, DEFAULT_SETTINGS, { storageEnum: StorageEnum.Local, liveUpdate: true })` を `packages/storage/lib/impl/focusgate-settings-storage.ts` に実装 |

- **createStorage パターン**: ボイラープレート標準の `createStorage` ファクトリを使用(例: `example-theme-storage.ts`)。`get`/`set`/`subscribe` を備え、`liveUpdate: true` で `chrome.storage.onChanged` を介した全コンテキスト同期が得られる。
- **機能設計の `SettingsRepository`** は、この設定ストレージオブジェクト + 補助関数(`addSite`/`updateSite`/`removeSite`)として実現する(クラスではない)。
- **アクセス一元化**: 設定アクセスは `@extension/storage` に集約し、キー名・スキーマ変更の影響を局所化。

### スキーマバージョニング / マイグレーション
- `FocusGateSettings.version` でスキーマ世代を管理(初期 1)。読み込み時に古い `version` を検出したら設定ストレージ側で変換・再保存する。
- Post-MVP のフィールド追加(スケジュール・統計等)に後方互換で対応。

### 容量制約
- `chrome.storage.local` のデフォルト上限は 10MB。FocusGate の設定 JSON は数 KB であり枯渇リスクはない。`unlimitedStorage` 権限は要求しない(過剰権限の回避)。

### バックアップ戦略
- MVP では自動バックアップなし。書き込みは `createStorage` の `set` に委ね、失敗時はユーザーに通知。将来、オプションからの JSON エクスポート/インポートを検討。

## パフォーマンス要件

| 操作 | 目標 | 測定方法 |
|------|------|---------|
| ブロック判定(ナビゲーション検知 → 振り分け) | 50ms 以内 | SW 内キャッシュ参照。Core i5 相当・`performance.now()` |
| ポップアップ表示 | 200ms 以内 | アイコンクリック → 描画完了。React の初期化を軽量に保つ |
| 非対象サイトの素通し | 判定オーバーヘッド 5ms 以内 | 全体OFF・非http を早期リターン |

### 主要な最適化手段
- **設定のメモリキャッシュ**: SW 起動時に設定を読み込み保持。`liveUpdate`(onChanged)で更新し、ナビゲーション毎の storage I/O を排除。
- **SW 再起動時のフォールバック**: SW は非永続のため、ナビゲーション検知時にキャッシュが未構築(null)なら、設定ストレージの `get()` を `await` してから判定する(初回のみ storage I/O を許容)。以降はキャッシュ参照。
- **早期リターン**: 全体OFF・非httpスキームを最初に除外。

## セキュリティアーキテクチャ

### 権限(manifest.ts)

現状の宣言と、FocusGate に必要な追加を示す。

| 権限 | 種別 | 現状 | FocusGate での要否 |
|------|------|------|-------------------|
| `storage` | permissions | ✅ あり | 必須(設定保存) |
| `tabs` | permissions | ✅ あり | 必須(レベルC リダイレクト `chrome.tabs.update`) |
| `scripting` | permissions | ✅ あり | content script 動的注入で利用可 |
| `notifications` | permissions | ✅ あり | MVP 未使用(警告は B=ページ内オーバーレイ / C=ブロック画面で実現。ブラウザ通知は不要) |
| `sidePanel` | permissions | ✅ あり | MVP 未使用 |
| **`webNavigation`** | permissions | ❌ **無し** | **★ 追加必須**(`onCompleted`/`onBeforeNavigate` でナビゲーション監視) |
| `host_permissions: ['<all_urls>']` | host | ✅ あり | content script を全サイトに注入し、判定時のみ介入する設計のため妥当 |

> **host_permissions の方針確定**: ユーザーが任意ドメインを登録できる動的ブロックリストの性質上、登録前サイトにも content script を注入できる必要があり、ボイラープレート既定の `<all_urls>` を採用する。**介入(オーバーレイ表示・リダイレクト)は `BlockEngine` が `blocked: true` を返した場合のみ**に限定し、全サイトへの不要な作用を避けることで実質的な影響範囲を最小化する。PRD の「最小権限」は「不要な権限を足さない(`webNavigation` 以外を増やさない)」方針で担保する。

### データ保護・入力検証
- **ローカル完結**: 設定・閲覧情報を外部送信しない。`chrome.storage.local` のみ使用。
- **入力検証**: ユーザー入力ドメインは `DomainNormalizer.isValid` で検証、`normalize` で正規化。
- **XSS 対策**: React の標準レンダリング(`dangerouslySetInnerHTML` を使わない)。content-ui のオーバーレイは Shadow DOM(`init-app-with-shadow`)で対象ページと分離。
- **CSP / MV3**: `eval`・インライン script を使用しない。

## 技術的制約

### プラットフォーム制約(Manifest V3)
- **Service Worker 非永続**: アイドルで停止する。状態をメモリ常駐に依存せず、`@extension/storage` を真実の源とし、起動時(または最初のイベント時)にキャッシュを再構築する。未構築時は `get()` を await(上記フォールバック)。
- **SPA クライアントサイド遷移**: `onBeforeNavigate`/`onCompleted` はフルページ遷移を捕捉するが、YouTube Shorts 等の `pushState`/`replaceState` による SPA 内遷移は捕捉しない。**MVP では SPA 内遷移のブロックはスコープ外**(初回アクセス遮断で PRD のコアバリューは達成)。Post-MVP で `onHistoryStateUpdated` の追加を検討。
- **content script 注入と判定タイミング**: レベルB の確認オーバーレイは content script が注入済みである必要がある。`onBeforeNavigate` 時点では未注入のため、**レベルB は `onCompleted`(またはメッセージング確立後)で発火する**設計とする。レベルC は描画前の `onBeforeNavigate` でリダイレクトする(詳細は [機能設計書](./functional-design.md))。

### ビルド・テスト制約
- ビルドは Turborepo 経由(`pnpm dev` / `pnpm build`)。ページ追加時は manifest と vite エントリの整合が必要。
- **ユニットテスト基盤は未導入**。純粋ロジックのテストには `@extension/block-engine` に Vitest を追加する。E2E は既存の WebDriverIO を使用。

## スケーラビリティ設計

- **共有ロジックの分離**: `@extension/block-engine`・`@extension/storage` に集約し、各コンテキストから再利用。新機能は共有層への追加で波及。
- **判定の拡張ポイント**: `BlockEngine.decide` に時間帯条件(スケジュール)やパス一致条件を判定ステップとして追加可能。
- **同期対応**: `focusgate-settings-storage.ts` の `storageEnum` を `Sync` に切替で対応可能。ただし `chrome.storage.sync` は容量上限(合計 100KB / 1アイテム 8KB)が `local` より厳しく、`sites` 増大時は複数キー分割の再設計が必要になりうる。

## テスト戦略

### ユニットテスト(追加)
- **対象**: `@extension/block-engine`(`BlockEngine` / `DomainNormalizer`)。`chrome.*` 非依存のため容易。
- **フレームワーク**: Vitest(`@extension/block-engine` に追加)。カバレッジ目標 90%。

### E2Eテスト(既存基盤)
- **ツール**: WebDriverIO(`tests/e2e/`)。`tests/e2e/specs/` に FocusGate シナリオ(レベルB/C、全体OFF素通し)を追加。

## 依存関係管理

- pnpm ワークスペース。内部依存は `workspace:*`。外部依存はボイラープレートの方針(`^` 中心)に従い、`pnpm-lock.yaml` をコミットして再現性を担保。
- ランタイム依存を極小化(`crypto.randomUUID()` 等ブラウザ標準を優先)。

## 付記: 初版からの主な変更点

| 項目 | 初版(誤) | 本版(実態整合) |
|------|----------|----------------|
| パッケージ管理 | npm・単一パッケージ | pnpm + Turborepo モノレポ |
| UI | バニラ TS(React 不採用) | React 19 |
| ストレージ | `SettingsRepository` クラス | `createStorage` パターン(`@extension/storage`) |
| ビルド | ルート `vite.config.ts` | 各ワークスペースの Vite + Turbo |
| ユニットテスト | Vitest 前提 | 未導入(`block-engine` に追加提案)。E2E は WebDriverIO |
| `webNavigation` | 宣言済み前提 | 未宣言 → 追加必須 |
