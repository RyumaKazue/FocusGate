# 設計書

## アーキテクチャ概要

新規アーキテクチャは導入しない。「テンプレート文字列・URLの置換」「ボイラープレートのデモ実体（content script / ページ）の削除」「未使用 i18n キーの整理」を、既存のビルド機構（`getContentScriptEntries` による matches 自動探索、Chrome i18n、turbo）の枠内で行う。

```
[変更の3系統]

A. メタデータ置換   : package.json / messages.json(en,ko) / const.ts / README.md
B. デモ実体の削除   : manifest.content_scripts / pages/content / content-ui/matches(all,example)
                      / content-runtime/matches(all,example) / 各デモページのUI
C. i18n キー整理    : 未使用デモキー削除 + 新タグライン追加 → en/ja/ko キー集合一致
```

## コンポーネント設計

### 1. 製品メタデータ（package.json / const.ts / messages.json）

**責務**: 拡張機能のアイデンティティ（名前・説明・リポジトリURL）を FocusGate に統一する。

**実装の要点**:
- `package.json`:
  - `name`: `chrome-extension-boilerplate-react-vite` → `focusgate`
  - `description`: `chrome extension boilerplate` → `集中を妨げるサイトを段階的に抑止する Chrome 拡張機能`
  - `repository.url`: → `https://github.com/RyumaKazue/FocusGate.git`
- `packages/shared/const.ts` `PROJECT_URL_OBJECT.url`: → `https://github.com/RyumaKazue/FocusGate`
- `messages.json`（en / ko）:
  - `extensionName.message`: → `FocusGate`
  - `extensionDescription.message`: en=`A Chrome extension that gradually curbs distracting sites to protect your focus.` / ko=`집중을 방해하는 사이트를 단계적으로 억제하는 Chrome 확장 프로그램`
  - ja は対応済み（変更不要）。

### 2. README

**責務**: リポジトリの説明を FocusGate のものにする。

**実装の要点**:
- ボイラープレートの README（ロゴ・バッジ・Discord・テンプレート手順）を、FocusGate のプロダクト概要／主要機能（段階的抑止 B/C・ブロックリスト・ON/OFF）／セットアップ（`pnpm install` → `pnpm dev` / `pnpm build`）／ライセンスを中心とした日本語 README に刷新する。
- ベースが boilerplate である旨は冒頭に一文クレジットとして残す（ライセンス上の礼儀・事実の保持）。

### 3. デモ content script / 全サイト注入の削除

**責務**: ユーザーの全ページ・example.com に注入されるボイラープレートのデモを除去する。

**実装の要点**:
- `chrome-extension/manifest.ts` の `content_scripts` を以下のみに整理:
  - 残す: `content-ui/focusgate.iife.js`（FocusGate 確認オーバーレイ）, `content.css`（共通スタイル）
  - 削除: `content/all.iife.js`, `content/example.iife.js`, `content-ui/all.iife.js`, `content-ui/example.iife.js`
- `getContentScriptEntries` は matches ディレクトリを自動探索するため、以下を削除すれば対応する `*.iife.js` は生成されなくなる:
  - `pages/content/src/matches/all`, `pages/content/src/matches/example`, `pages/content/src/sample-function.ts`
  - `pages/content-ui/src/matches/all`, `pages/content-ui/src/matches/example`
  - `pages/content-runtime/src/matches/all`, `pages/content-runtime/src/matches/example`
- 各パッケージ（content / content-runtime）は matches が空になっても build.mts は no-op となるため、**パッケージ自体は残置**する（削除はスコープ外）。
- `content.css` は content-ui のビルドで生成される共通CSS。focusgate match が利用するため維持する。

### 4. デモページの削除（new-tab / side-panel / devtools-panel / devtools）

**責務**: ボイラープレートのデモページを丸ごと削除し、対応する manifest 登録を除去する。

**実装の要点**:
- ディレクトリごと削除: `pages/new-tab`, `pages/side-panel`, `pages/devtools-panel`, `pages/devtools`（devtools ページは panel を生成するだけのため併せて削除）。
- `chrome-extension/manifest.ts` から以下を除去:
  - `chrome_url_overrides`（newtab override）
  - `side_panel`
  - `devtools_page`
  - `permissions` から `sidePanel`（他で未使用のため除去。`packages/dev-utils` の Firefox 用 sidePanel 除去フィルタは残しても無害）
- これらのページは `pnpm-workspace.yaml` の `pages/*` で glob されるのみで、相互 import は無いため、ディレクトリ削除＋manifest 整理で完結する。
- `packages/module-manager/lib/const.ts` 等が削除対象をディレクトリ名の文字列で参照するが、プレーンな定数でビルドに影響しないため**本タスクでは触らない**（スコープ外）。

### 5. 未使用デモ i18n キーの整理

**責務**: 3ロケールのキー集合を一致させ、デモ専用キーを排除する。

**実装の要点**:
- 削除キー（en / ja / ko 共通）: `injectButton`, `greeting`, `hello`, `toggleTheme`
  - `injectButton` / `greeting`: 既に未参照。
  - `hello` / `toggleTheme`: フェーズ3・4のデモ削除で未参照化してから削除。
- デモページを削除するためタグライン等の新規キーは不要（`focusTagline` は追加しない）。
- 最終的に en / ja / ko のキー集合が完全一致することを node スクリプトで検証する。

### 6. e2e テストの整理

**責務**: 削除するデモ機能に依存する e2e を破綻させない。

**実装の要点**:
- デモ依存スペックを削除/調整:
  - `tests/e2e/specs/page-content.test.ts`（example.com のデモ content script ログ）→ 削除
  - `tests/e2e/specs/page-content-ui.test.ts`（全サイト/example の注入UI）→ 削除
  - テーマ切替に依存するスペック（`tests/e2e/helpers/theme.ts` 利用箇所）→ 削除し、未参照になった helper も削除
  - `tests/e2e/specs/smoke.test.ts` は拡張が読み込めることの確認に留まる場合は維持、デモ前提なら FocusGate 向けに調整
- e2e は `pnpm e2e`（zip → wdio）で重く CI 前提のため、本タスクでは**スペックの静的整合（参照切れ・デモ前提の除去）まで**を担保し、実ブラウザ実行は必須としない。

## データフロー

本変更はUI表示・ビルド構成の整理であり、新規ランタイムフローは追加しない。

## エラーハンドリング戦略

- 新規ロジックなし。リスクは「削除漏れ／参照切れ」。→ ビルド・lint・キー集合検証で担保。

## テスト戦略

### 静的・ビルド検証
- `pnpm build` 成功（matches 削除後も全21タスクがビルドできる）。
- `pnpm lint`（未使用 import / 参照切れがないこと）。
- en/ja/ko キー集合一致チェック（node）。

### 手動確認（任意・可能なら）
- 任意ページでデモUIが出ないこと、新タブ/サイドパネルが FocusGate 表示になること。

## 依存ライブラリ

新規追加・削除なし。

## ディレクトリ構造

```
package.json                         （name/description/repository 更新）
README.md                            （刷新）
packages/shared/const.ts             （URL 更新）
packages/i18n/locales/en/messages.json  （name/desc 更新, デモキー削除）
packages/i18n/locales/ja/messages.json  （デモキー削除）
packages/i18n/locales/ko/messages.json  （name/desc 更新, デモキー削除）
chrome-extension/manifest.ts         （content_scripts 整理, newtab/side_panel/devtools_page/sidePanel 除去）

削除:
pages/new-tab, pages/side-panel, pages/devtools-panel, pages/devtools （ディレクトリごと）
pages/content/src/matches/all, .../example, pages/content/src/sample-function.ts
pages/content-ui/src/matches/all, .../example
pages/content-runtime/src/matches/all, .../example
tests/e2e/specs/page-content.test.ts, page-content-ui.test.ts, （テーマ依存スペック）, tests/e2e/helpers/theme.ts
```

## 実装の順序

1. メタデータ更新（package.json / const.ts / en・ko messages）。
2. README 刷新。
3. デモ content script / 全サイト注入の削除（matches 削除 → manifest 整理）。
4. デモページの削除（new-tab / side-panel / devtools-panel / devtools）＋ manifest 登録・権限の除去。
5. 未使用デモ i18n キー削除（en/ja/ko）。
6. e2e テスト整理。
7. 検証（キー一致 / type-check / lint / build）。

## セキュリティ考慮事項

- 全サイトへのデモUI注入を撤去することで、不要な DOM 注入面が減りむしろ安全側。
- ブロック画面・オーバーレイなど FocusGate 本体の注入・権限は変更しない。

## パフォーマンス考慮事項

- 全ページ注入の content-ui/all を撤去するため、各ページでの不要なスクリプト実行が減る（軽微な改善）。

## 将来の拡張性

- デモページ削除後に未参照となる `exampleThemeStorage` / `ToggleButton` / `PROJECT_URL_OBJECT` や、`packages/module-manager` の整理は別タスクで判断する（本タスクでは共通パッケージの公開面を壊さない）。
