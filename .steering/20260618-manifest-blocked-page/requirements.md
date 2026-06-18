# 要求内容

## 概要

レベルC（完全ブロック）の「出口」となる静的ブロック画面 `blocked.html` を作成し、SW がナビゲーション監視（ステップ4）でこの画面へリダイレクトできるよう manifest に必要な権限とリソース公開を追加する。React 非依存・MV3 デフォルト CSP 遵守の最小実装。

## 背景

`docs/mvp-implementation-plan.md` のステップ3に相当する。確定方針「レベルC先」に従い、まず完全ブロックの出口画面を用意する。SW（ステップ4）は `chrome.webNavigation.onBeforeNavigate` でブロック対象を検知すると `chrome.tabs.update` で当該タブを `blocked.html?site=...` にリダイレクトする。そのために事前に:

1. `webNavigation` 権限を manifest に追加（ナビゲーション監視に必須）
2. `blocked.html` を `web_accessible_resources` に登録（拡張ページとして読み込み可能にする）

本ステップは storage / SW に依存しない静的作業であり、`blocked.html` 単体を直接 URL アクセスして表示確認できる。

## 重要な技術判断

- **CSP 遵守のため `?site=` のパースは外部スクリプト `blocked.js` で行う**。MV3 拡張ページのデフォルト CSP は `script-src 'self'` でありインラインスクリプトを禁止する。そのため `location.search` のパース処理は `public/blocked.js` に分離し、`blocked.html` から `<script src="blocked.js">` で参照する。`*.js` は既に `web_accessible_resources` に含まれるため追加登録は不要。

## 実装対象の機能

### 1. blocked.html（新規・public/）
- 静的 HTML。集中を促す穏やかなメッセージ＋対象サイト名を表示
- 装飾は最小限・刺激の少ないトーン（機能設計書 499 行）
- インラインスクリプト・インラインスタイルに依存しない構成（CSP 遵守）
- 履歴ループ対策として「前のページに戻る／タブを閉じる」導線のみ提供（機能設計書 500 行）

### 2. blocked.js（新規・public/）
- `new URLSearchParams(location.search).get('site')` で対象サイト名を取得し DOM に反映
- 値が無い場合のフォールバック表示
- 「戻る」導線のハンドラ（`history.back()` 等）

### 3. manifest.ts（編集）
- `permissions` に `'webNavigation'` を追加
- `web_accessible_resources[0].resources` に `'blocked.html'` を追加

## 受け入れ条件

- [ ] `pnpm dev`（または build）で `dist/blocked.html` と `dist/blocked.js` が生成される（`public/` 配下は dist 直下へコピーされる）
- [ ] `chrome-extension://<id>/blocked.html?site=youtube.com` を直接開くと対象サイト名「youtube.com」が表示される
- [ ] `?site=` 無しでアクセスしてもエラーにならずフォールバック表示される
- [ ] CSP 違反（インラインスクリプトブロック）のコンソールエラーが出ない
- [ ] manifest に `webNavigation` 権限が含まれる
- [ ] `web_accessible_resources` に `blocked.html` が含まれる
- [ ] 「戻る」導線が機能する

## 成功指標

- レベルC の出口画面が単体で表示・動作し、ステップ4（SW リダイレクト）で即座に接続できる状態になる
- manifest が webNavigation 監視に必要な権限を備える

## スコープ外

以下はこのフェーズ（ステップ3）では実装しません:

- SW のナビ監視・`tabs.update` リダイレクト本体 = ステップ4
- popup / options UI = ステップ5
- レベルB オーバーレイ = ステップ6
- blocked.html の i18n 化（MVP では穏やかな固定文言。UI i18n 整備はステップ5以降）
- リダイレクト後の履歴からの URL 除外処理（SW 側の責務、ステップ4で検討）

## 参照ドキュメント

- `docs/mvp-implementation-plan.md` - MVP 実装計画（ステップ3: 133-143行）
- `docs/functional-design.md` - ブロック画面仕様（495-500行）・権限（536行）
- `docs/architecture.md` - 権限最小化方針
- `docs/development-guidelines.md` - コーディング規約
