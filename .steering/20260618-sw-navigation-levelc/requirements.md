# 要求内容

## 概要

Service Worker（background）にナビゲーション監視を実装し、レベルC（完全ブロック）対象サイトへのフルページ遷移を `blocked.html` へリダイレクトする。これにより「対象サイトを開くとレベルC でブロックされる」最小縦スライスを実機で貫通させる（確定方針1の達成点）。

## 背景

`docs/mvp-implementation-plan.md` のステップ4に相当する。ここまでで判定の頭脳（`BlockEngine`・ステップ1）、設定の永続化窓口（`focusgateSettingsStorage`・ステップ2）、ブロック画面の出口（`blocked.html`・ステップ3）が揃った。本ステップでこれらを SW で接続し、`chrome.webNavigation.onBeforeNavigate` で遷移を捕捉 → `BlockEngine.decide` で判定 → レベルC なら `chrome.tabs.update` で当該タブを `blocked.html` に置換する。

性能要件（判定 50ms 以内）のため、設定は SW のモジュールスコープにキャッシュし、`focusgateSettingsStorage.subscribe`（liveUpdate）で更新する。判定毎の storage 読み込みを避け、未構築時のみ `get()` にフォールバックする（機能設計書 528 行）。

## 実装対象の機能

### 1. ナビゲーション監視モジュール（navigation.ts）
- 設定キャッシュ: モジュールスコープ `cache`。初回 `focusgateSettingsStorage.get()` で構築、`subscribe(() => cache = getSnapshot())` で更新
- `registerNavigation()`:
  - `chrome.webNavigation.onBeforeNavigate` を購読（`frameId === 0` のメインフレームのみ）
  - `BlockEngine.decide(url, settings)` が `blocked && level === 'C'` のとき `chrome.tabs.update(tabId, { url: blocked.html + '?site=' + encodeURIComponent(site.label ?? site.domain) })`
  - レベルB はこのステップでは何もしない（ステップ6で `onCompleted` 実装、受け皿コメントを残す）

### 2. background エントリ接続
- `chrome-extension/src/background/index.ts` で `registerNavigation()` を呼び出す
- theme サンプル（`exampleThemeStorage` のログ出力）を除去

### 3. 依存追加
- `chrome-extension/package.json` の dependencies に `@extension/block-engine: workspace:*` を追加

## 受け入れ条件

### 縦スライス（実機）
- [ ] レベルC（`warningLevel='C'`）設定で `youtube.com` を開くと `blocked.html?site=...` にリダイレクトされ、対象ページが表示されない
- [ ] `blocked.html` に対象サイト名（`label ?? domain`）が表示される
- [ ] `globalEnabled=false` のとき対象サイトが素通しされる
- [ ] サイト個別 `enabled=false` のとき当該サイトが素通しされる
- [ ] 非対象サイト・非 http(s) スキームが素通しされる
- [ ] `blocked.html` 自体は再ブロックされない（extension スキームは matchSite で非マッチ）

### 設定キャッシュ
- [ ] SW 起動時に設定がキャッシュされる
- [ ] popup/options での設定変更が `subscribe` 経由でキャッシュに反映され、次の遷移判定に効く

### 品質
- [ ] `pnpm -F chrome-extension type-check` が通過
- [ ] `pnpm -F chrome-extension lint` がエラー0
- [ ] `pnpm build` が成功し `dist/background.js` が生成される

## 成功指標

- 「対象サイトを開くとレベルC でブロックされる」最小縦スライスが実機で動作（確定方針1の達成点）
- 判定が設定キャッシュ経由で行われ、storage の同期的読み込みに依存しない

## スコープ外

以下はこのフェーズ（ステップ4）では実装しません:

- レベルB の確認オーバーレイ・`onCompleted`・再発動防止マップ = ステップ6（受け皿コメントのみ残す）
- popup / options UI = ステップ5
- SPA 内遷移（pushState 等）の捕捉 = MVP スコープ外
- リダイレクト後の履歴からの URL 除外（blocked.html 側の「戻る」導線で代替。Post-MVP 検討）

## 参照ドキュメント

- `docs/mvp-implementation-plan.md` - MVP 実装計画（ステップ4: 147-167行）
- `docs/functional-design.md` - 判定アルゴリズム（270-336行）・レベルC（235行）・設定キャッシュ（528行）・SPA スコープ（522-524行）
- `docs/architecture.md` - 権限最小化・SW 配置
- `docs/development-guidelines.md` - コーディング規約
