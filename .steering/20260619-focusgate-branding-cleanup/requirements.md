# 要求内容

## 概要

ボイラープレート（chrome-extension-boilerplate-react-vite）由来のテンプレート情報・デモ機能が拡張機能内に残っている。これらを FocusGate の情報に更新し、ユーザーに見えるデモUIを除去して、プロダクトとしての一貫性を確立する。

## 背景

本リポジトリは chrome-extension-boilerplate-react-vite をベースにしている。FocusGate 固有の実装（ポップアップ・オプション・確認オーバーレイ・ブロック画面・バックグラウンド）は追加済みだが、以下のテンプレート残骸が混在している。

- **製品メタデータ**: `package.json` の name/description/repository、`extensionName`/`extensionDescription`（en/ko）、`PROJECT_URL_OBJECT` がボイラープレートのまま。
- **README**: ボイラープレートの README（英語・テンプレート説明）のまま。
- **デモ機能/UI**: 新タブ・サイドパネル・DevTools パネルがボイラープレートのロゴ＋「Edit pages/...」＋GitHubリンク＋テーマ切替のデモ表示。さらに **全サイトに** デモUI（"Edit ... save to reload"）を注入する content-ui があり、`example.com` 向けデモ content script、`content`/`content-runtime` のサンプルも残る。
- **デモ i18n キー**: `injectButton` / `greeting` は未使用、`hello` / `toggleTheme` はデモ表示でのみ使用。

特に「全サイトへのデモUI注入」と「新タブのボイラープレート表示」はユーザーに直接見えるため、プロダクト品質上の問題が大きい。

## 実装対象の機能

### 1. 製品メタデータの FocusGate 化
- `package.json` の `name` / `description` / `repository.url` を FocusGate のものに更新。
- `packages/i18n/locales/en/messages.json` と `ko/messages.json` の `extensionName` を "FocusGate"、`extensionDescription` を FocusGate の説明に更新（ja は対応済み）。
- `packages/shared/const.ts` の `PROJECT_URL_OBJECT` を FocusGate リポジトリ（`https://github.com/RyumaKazue/FocusGate`）に更新。

### 2. README の刷新
- ボイラープレートの README を、FocusGate のプロダクト説明・セットアップ・開発手順を中心とした日本語 README に書き換える。

### 3. デモ content script / 全サイト注入の除去
- `manifest.ts` の `content_scripts` から `example.com` 向けデモと「全サイトへのデモUI注入」（content/all・content-ui/all・example 系）を除去し、FocusGate の注入（content-ui/focusgate）と必要な共通CSSのみ残す。
- `pages/content`（all/example, sample-function）、`pages/content-ui/matches`（all/example）、`pages/content-runtime`（all/example）のデモ実体を除去。

### 4. デモページの削除
- `pages/new-tab` / `pages/side-panel` / `pages/devtools-panel` / `pages/devtools` のボイラープレートデモページを**ディレクトリごと削除**する。
- `manifest.ts` から対応する登録（`chrome_url_overrides.newtab` / `side_panel` / `devtools_page`）と、不要になる `sidePanel` 権限を除去する。

### 5. 未使用デモ i18n キーの除去
- 除去後に未参照となるデモキー（`injectButton` / `greeting` / `hello` / `toggleTheme`）を en / ja / ko の各 `messages.json` から削除し、3ロケールのキー集合を一致させる。

### 6. e2e テストの整理
- 除去するデモ機能に依存する e2e スペック（`example.com` のデモ content script / 全サイト注入UI / テーマ切替）を削除または FocusGate 向けに調整し、テストスイートが破綻しないようにする。

## 受け入れ条件

### 製品メタデータ
- [ ] `package.json` の name/description/repository が FocusGate を指す。
- [ ] en/ko の `extensionName` が "FocusGate"、`extensionDescription` が FocusGate の説明になっている。
- [ ] `PROJECT_URL_OBJECT` が FocusGate リポジトリURLになっている。

### README
- [ ] README が FocusGate のプロダクト説明・セットアップ手順を中心とした内容になっている。

### デモ除去
- [ ] 任意のWebページを開いても、ボイラープレートのデモUI（"Edit ... save to reload" の青いボックス）が表示されない。
- [ ] `manifest.ts` の content_scripts に `example.com` 向けデモ・全サイトデモ注入が残っていない。
- [ ] `pages/new-tab` / `pages/side-panel` / `pages/devtools-panel` / `pages/devtools` が削除され、`manifest.ts` から newtab override / side_panel / devtools_page / sidePanel 権限が除去されている。

### i18n / 整合
- [ ] en / ja / ko の `messages.json` のキー集合が一致し、未使用デモキーが残っていない。
- [ ] `pnpm type-check` 起因の新規エラーがなく、`pnpm lint` / `pnpm build` が成功する。

## 成功指標

- ユーザーが拡張機能の各サーフェス（新タブ・サイドパネル・任意ページ・拡張機能管理画面）を見たときに、ボイラープレートの痕跡が見当たらず FocusGate として一貫している。

## スコープ外

以下はこのフェーズでは実装しません:

- `packages/module-manager`（ボイラープレート付属のモジュール管理CLI）の整理。削除するデモページをディレクトリ名の文字列定数で参照しているが、プレーンな定数でありビルドには影響しない。FocusGate ランタイムとも無関係なため、整理は別タスクとする。
- `exampleThemeStorage` / `ToggleButton`（共通UI部品）/ `PROJECT_URL_OBJECT` の削除。デモページ削除後に未参照になるが、共通パッケージの公開面に手を入れるのを避けるため残置し（`PROJECT_URL_OBJECT` は URL のみ FocusGate に更新）、別タスクで検討する。
- 新タブ等を FocusGate 独自機能として作り直すこと（集中状況の可視化など）。今回は削除のみ。

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書
- `docs/architecture.md` - アーキテクチャ設計書
- `docs/repository-structure.md` - リポジトリ構造定義書
