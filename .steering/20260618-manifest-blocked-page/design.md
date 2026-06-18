# 設計書

## アーキテクチャ概要

`blocked.html` はレベルC の出口となる**静的拡張ページ**。`public/` 配下に置くと Vite の `publicDir`（`chrome-extension/vite.config.mts:34`）により dist 直下へそのままコピーされる（既存 `content.css` と同じ前例）。React やバンドルを介さず、`blocked.html` + `blocked.js` の素の2ファイルで完結させる。

```
SW(ステップ4) ──chrome.tabs.update──▶ chrome-extension://<id>/blocked.html?site=YouTube
                                              │ <script src="blocked.js">
                                              ▼
                                      blocked.js: URLSearchParams で site 取得 → DOM 反映
```

manifest 側は、SW がナビゲーションを監視するための `webNavigation` 権限と、`blocked.html` を拡張ページとして読み込むための `web_accessible_resources` 登録を追加する。

## コンポーネント設計

### 1. blocked.html（`chrome-extension/public/blocked.html`）

**責務**:
- 集中を促すメッセージと対象サイト名のプレースホルダを持つ静的マークアップ
- 「戻る」導線の提供

**実装の要点**:
- `<!doctype html>` + `<html lang>` + `<meta charset>` + `<meta name="viewport">`
- スタイルは外部 `blocked.css`（または `<style>` 要素）で。MV3 デフォルト CSP は `style-src` にインラインを許容するため `<style>` 要素は使用可（インライン `style=` 属性も可）。スクリプトのみ外部化が必須。シンプルさのため `<style>` を head に置く方針とする
- 対象サイト名は `<span id="site-name"></span>` 等のプレースホルダにし、`blocked.js` が埋める
- 「戻る」ボタン `<button id="back-button">` を設置（クリックは `blocked.js` で `addEventListener` → インライン `onclick` は使わない＝スクリプト分離の一貫性）
- 末尾で `<script src="blocked.js"></script>` を読み込む

### 2. blocked.js（`chrome-extension/public/blocked.js`）

**責務**:
- クエリから対象サイト名を取り出し DOM に反映
- 「戻る」ボタンのイベント登録

**実装の要点**:
- `const site = new URLSearchParams(location.search).get('site');`
- `document.getElementById('site-name').textContent = site ?? '(指定なし)';`（`textContent` で XSS 回避。`innerHTML` は使わない）
- `document.getElementById('back-button')?.addEventListener('click', () => history.back());`
- 素の DOM API のみ。chrome.* 非依存（i18n 不使用、固定文言）

### 3. manifest.ts（編集）

**責務**: webNavigation 監視と blocked.html 公開の許可

**実装の要点**:
- `permissions: [...既存, 'webNavigation']`（`storage`/`scripting`/`tabs`/`notifications`/`sidePanel` の並びに追加）
- `web_accessible_resources[0].resources` に `'blocked.html'` を追加（`*.js`/`*.css` は既存のため `blocked.js`/`blocked.css` は追加不要）

## データフロー

### blocked.html 表示フロー
```
ユーザー/SW が blocked.html?site=youtube.com を開く
  ▼ HTML パース・<style> 適用
  ▼ blocked.js ロード（CSP: script-src 'self' を満たす外部スクリプト）
  ▼ URLSearchParams で site='youtube.com' 取得
  ▼ #site-name に textContent で反映
  ▼ #back-button に click→history.back() を登録
```

## エラーハンドリング戦略

### エラーハンドリングパターン
- `?site=` 欠落時は `null` を安全なフォールバック文言に置換（例外を投げない）
- 値は必ず `textContent` で挿入し、悪意あるクエリによる DOM インジェクションを防止

## テスト戦略

### 手動テスト
- `pnpm dev` で dist を Chrome（一時プロファイル）に読み込み
- `chrome-extension://<id>/blocked.html?site=youtube.com` を直接開いて表示確認
- `?site=` 無しのフォールバック確認
- DevTools コンソールに CSP 違反エラーが出ないこと
- 「戻る」ボタン動作確認

### 自動テスト
- なし（静的ページのため。実機の縦スライス接続はステップ4）

## 依存ライブラリ

- 追加なし（素の HTML/CSS/JS）

## ディレクトリ構造

```
chrome-extension/
├── manifest.ts                 (編集: webNavigation 権限 + blocked.html 公開)
└── public/
    ├── blocked.html            (新規)
    ├── blocked.js              (新規)
    └── content.css             (既存・コピーの前例)
```

## 実装の順序

1. `public/blocked.html` を作成（マークアップ＋`<style>`＋プレースホルダ＋`<script src>`）
2. `public/blocked.js` を作成（クエリパース＋戻る導線）
3. `manifest.ts` を編集（`webNavigation` 権限、`blocked.html` を resources へ）
4. `pnpm dev` で dist 生成 → Chrome 読み込み → 直接 URL アクセスで手動確認

## セキュリティ考慮事項

- **CSP 遵守**: スクリプトは外部ファイル化し、インライン `<script>`・`onclick` 属性を使わない（MV3 `script-src 'self'`）
- **XSS 防止**: クエリ値は `textContent` のみで挿入（`innerHTML` 不使用）
- **権限最小化**: `webNavigation` 追加は監視に必須。実際の介入は `blocked: true` 時のみ（ステップ4で限定）

## パフォーマンス考慮事項

- 静的ページ・依存ゼロのため即時表示。React 初期化コストなし

## 将来の拡張性

- 文言の i18n 化（`chrome.i18n.getMessage`）は `blocked.js` 経由で後付け可能（本ステップでは固定文言）
- レベルB との UI トーン統一はステップ6で content-ui オーバーレイと合わせて調整
