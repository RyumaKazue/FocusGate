# 設計書

## アーキテクチャ概要

既存の i18n 機構をそのまま活用し、「日本語ロケールの追加」と「ロケール解決のデフォルトを日本語にする」ことでUI文言を日本語へ統一する。新規ライブラリやコンポーネントの追加は行わない。

```
[ビルド/実行時のロケール解決]

本番ビルド (i18n-prod.ts)
  chrome.i18n.getMessage(key)
    └─ Chrome の UI 言語に対応する _locales/<lang>/messages.json
        └─ 対応が無ければ manifest.default_locale = 'ja' → _locales/ja/messages.json

開発ビルド (i18n-dev.ts + set-related-locale-import.ts)
  CEB_DEV_LOCALE=ja → import '../locales/ja/messages.json'
    （未設定時はシステムロケール → 無ければ en）

[文言の所在]
  ポップアップ/オプション/オーバーレイ : t() 経由 → locales/<lang>/messages.json
  ブロック画面 (blocked.html/js)        : 静的HTML/JSにハードコード（日本語）
  拡張機能名/説明                       : __MSG_extensionName__ / __MSG_extensionDescription__ → locales
```

## コンポーネント設計

### 1. 日本語ロケールファイル（packages/i18n/locales/ja/messages.json）

**責務**:
- `en/messages.json` の全キーに対応する日本語メッセージを提供する。
- Chrome i18n のメッセージ形式（`message` / `description` / `placeholders`）を踏襲する。

**実装の要点**:
- キー集合は `en/messages.json` と完全一致させる（欠落キーがあるとそのキーだけ空表示・フォールバックになる）。
- `greeting` の `placeholders`（`$NAME$`）など、プレースホルダ構造は en と同形で維持する。
- `extensionName` は "FocusGate"（固有名詞）、`extensionDescription` は日本語のプロダクト説明にする。
- FocusGate 固有キーの訳語はオーバーレイ/ブロック画面のトーン（です・ます調、落ち着いた表現）に揃える。

### 2. manifest（chrome-extension/manifest.ts）

**責務**:
- 本番ビルドにおける Chrome i18n のフォールバック言語を日本語に設定する。

**実装の要点**:
- `default_locale: 'en'` → `default_locale: 'ja'` の1行変更のみ。
- `ja` ロケールが存在しないと Chrome がパッケージ検証でエラーになるため、ロケールファイル作成と同一フェーズで行う。

### 3. 環境変数（.env / .example.env）

**責務**:
- 開発ビルドのロケール選択を日本語に固定する。

**実装の要点**:
- `CEB_DEV_LOCALE=` → `CEB_DEV_LOCALE=ja`。
- `.env` は CLI でのみ編集可の行（`CLI_*`）は触らず、編集可能セクションのみ変更する。
- `.example.env` も合わせて更新し、新規クローン時の既定を日本語にする。

### 4. ブロック画面（blocked.html / blocked.js）

**責務**:
- レベルC ブロック時の日本語文言を表示する（既存）。

**実装の要点**:
- 既に日本語のため大きな変更は不要。他UIとのトーン整合のみ確認し、必要なら微修正する。
- `chrome.i18n` 化はスコープ外（静的ページ・CSP 制約のため別タスク）。

## 訳語マッピング（messages.json: en → ja）

| キー | en | ja（案） |
| --- | --- | --- |
| extensionName | Chrome extension boilerplate | FocusGate |
| extensionDescription | Chrome extension boilerplate developed with... | 集中を妨げるサイトを段階的に抑止する Chrome 拡張機能 |
| popupTitle | FocusGate | FocusGate |
| globalEnabled | Blocking enabled | ブロックを有効化 |
| warningLevel | Warning level | 警告レベル |
| levelB | Confirm (B) | 確認（B） |
| levelC | Block (C) | ブロック（C） |
| openOptions | Manage block list | ブロックリストを管理 |
| optionsTitle | Block list | ブロックリスト |
| addSite | Add | 追加 |
| domainPlaceholder | example.com | example.com |
| labelPlaceholder | Label (optional) | ラベル（任意） |
| edit | Edit | 編集 |
| save | Save | 保存 |
| cancel | Cancel | キャンセル |
| delete | Delete | 削除 |
| noSites | No sites registered yet. | 登録されたサイトはまだありません。 |
| errorInvalidDomain | Invalid domain. | ドメインの形式が正しくありません。 |
| errorDuplicateDomain | This domain is already registered. | このドメインは既に登録されています。 |
| overlayHeading | Take a breath | ひと呼吸おきましょう |
| overlayMessage | This site can break your focus... | このサイトは集中を妨げる可能性があります。本当に開きますか？ |
| proceed | Proceed anyway | それでも開く |
| stopBrowsing | Go back | やめておく |

※ ボイラープレート由来キー（toggleTheme / injectButton / greeting / hello / displayError* など）も en と同一キーで日本語訳を付与する。

## データフロー

### UI文言の表示（本番）
```
1. ユーザーがポップアップ等を開く
2. コンポーネントが t('key') を呼ぶ → chrome.i18n.getMessage('key')
3. Chrome が UI 言語の _locales を探索、無ければ default_locale='ja' の messages.json を返す
4. 日本語文言が表示される
```

## エラーハンドリング戦略

- 本変更は文言・設定のみで新規ロジックは無いため、ランタイムのエラーハンドリング追加は不要。
- 想定リスク: `ja/messages.json` のキー欠落 → 当該UIが空表示。→ en とのキー差分チェックで担保する。

## テスト戦略

### ユニットテスト
- 既存テストへの影響は無い想定（文言・設定変更のみ）。新規ユニットテストは追加しない。

### 統合テスト / 手動確認
- `pnpm build` 後、`dist/_locales/ja/messages.json` が生成され全キーを含むことを確認。
- ポップアップ・オプション・オーバーレイ・ブロック画面の文言がすべて日本語であることを確認（可能なら実機）。

## 依存ライブラリ

新規追加なし。

## ディレクトリ構造

```
packages/i18n/locales/
  ├── en/messages.json      （既存・変更なし）
  ├── ko/messages.json      （既存・変更なし）
  └── ja/messages.json      （新規作成）

chrome-extension/manifest.ts   （default_locale: 'ja' に変更）
.env                           （CEB_DEV_LOCALE=ja に変更）
.example.env                   （CEB_DEV_LOCALE=ja に変更）
chrome-extension/public/blocked.html / blocked.js （トーン整合の確認・必要時微修正）
```

## 実装の順序

1. `ja/messages.json` を作成（en の全キーを日本語化）。
2. `manifest.ts` の `default_locale` を `'ja'` に変更。
3. `.env` / `.example.env` の `CEB_DEV_LOCALE` を `ja` に変更。
4. ブロック画面の文言トーンを確認し必要なら微修正。
5. キー差分チェック・型チェック・lint・ビルドで検証。

## セキュリティ考慮事項

- ブロック画面のクエリ値挿入は既存通り `textContent` のみ（DOM インジェクション防止）を維持し、文言変更で崩さない。
- 設定・文言の変更のみで権限やデータ取り扱いに影響しない。

## パフォーマンス考慮事項

- 追加するのは静的JSON1ファイルのみ。バンドルサイズ・実行性能への影響は無視できる。

## 将来の拡張性

- en / ko ロケールを残すことで、将来的な多言語切り替えUIの追加余地を確保する。
- ブロック画面の `chrome.i18n` 化を別タスクとして切り出せば、全UIを完全にロケール駆動へ統一可能。
