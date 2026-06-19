# 要求内容

## 概要

拡張機能のユーザー向けUI文言を日本語に統一する。現状、ブロック画面は日本語、その他のUI（ポップアップ・オプション・確認オーバーレイ・拡張機能名/説明）は英語で表示されており、表記が混在している。

## 背景

FocusGate は日本語ユーザーを対象としたプロダクト（`docs/product-requirements.md` 参照）であり、ドキュメント類もすべて日本語で記述されている。しかし実機UIでは以下の混在が発生している。

- **i18n 経由のUI**（ポップアップ・オプション・確認オーバーレイ）: `@extension/i18n` の `t()` を使用。`packages/i18n/locales/` に `en` / `ko` のみ存在し `ja` が無く、`manifest.ts` の `default_locale` が `'en'` のため **英語表示** になる。
- **ブロック画面**（`chrome-extension/public/blocked.html` / `blocked.js`）: 日本語をハードコード。
- **拡張機能名・説明**（`__MSG_extensionName__` / `__MSG_extensionDescription__`）: 英語（"Chrome extension boilerplate"）のまま。

この混在により、日本語ユーザーにとって一貫性のない体験になっている。

## 実装対象の機能

### 1. 日本語ロケール（ja）の追加
- `packages/i18n/locales/ja/messages.json` を新規作成し、`en/messages.json` の全キーを日本語訳で定義する。
- FocusGate 固有キー（ポップアップ・オプション・オーバーレイ）に加え、ボイラープレート由来のキー（エラー表示・拡張機能名/説明など）も日本語化する。
- 拡張機能名は固有名詞のため "FocusGate" を維持し、説明文のみ日本語化する。

### 2. デフォルトロケールの日本語化
- `chrome-extension/manifest.ts` の `default_locale` を `'ja'` に変更し、本番ビルドで Chrome の i18n フォールバックが日本語になるようにする。

### 3. 開発ビルドの日本語化
- `.env` / `.example.env` の `CEB_DEV_LOCALE` を `ja` に設定し、開発ビルド（`set-related-locale-import.ts`）でも日本語が選択されるようにする。

### 4. ブロック画面の文言整合
- 既に日本語の `blocked.html` / `blocked.js` の文言トーンを、他UI（オーバーレイ等）と整合させる（必要に応じて微調整）。

## 受け入れ条件

### 日本語ロケール（ja）の追加
- [ ] `packages/i18n/locales/ja/messages.json` が存在し、`en/messages.json` と同一のキー集合を持つ。
- [ ] FocusGate 固有キーがすべて自然な日本語で定義されている。
- [ ] `extensionDescription` が日本語、`extensionName` が "FocusGate" になっている。

### デフォルトロケールの日本語化
- [ ] `manifest.ts` の `default_locale` が `'ja'` である。

### 開発ビルドの日本語化
- [ ] `.env` / `.example.env` の `CEB_DEV_LOCALE` が `ja` である。

### 全体整合
- [ ] ポップアップ・オプション・確認オーバーレイ・ブロック画面の文言がすべて日本語で表示される。
- [ ] `pnpm type-check` / `pnpm lint` / `pnpm build` が成功する。

## 成功指標

- 実機（または生成された `dist/_locales/ja/messages.json`）でUI文言がすべて日本語になり、英語の混在が解消される。

## スコープ外

以下はこのフェーズでは実装しません:

- 英語（en）・韓国語（ko）ロケールの削除（フォールバック・多言語対応の余地として残す）。
- 多言語切り替えUI（ユーザーが言語を選ぶ機能）の追加。
- コード内コメントやドキュメントの言語変更（既に日本語で統一されており対象外）。
- ブロック画面の i18n（`chrome.i18n`）化（現状ハードコード日本語で要件を満たすため、別タスクとする）。

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書
- `docs/architecture.md` - アーキテクチャ設計書
- `docs/development-guidelines.md` - 開発ガイドライン
