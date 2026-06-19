# 要求内容

## 概要

MVP 実装計画ステップ5。popup と options の UI を FocusGate 固有実装に置き換え、`useStorage(focusgateSettingsStorage)` の `liveUpdate` を通じて両画面が相互に整合する設定管理 UI を構築する。

## 背景

ステップ4までで縦スライス（対象サイトを開くとレベルC でブロック）が SW 側で貫通済み。ただし設定変更手段が SW のデバッグコンソールしかなく、エンドユーザーが操作できない。boilerplate の theme サンプル UI を置換し、P0 機能（全体/個別 ON/OFF・警告レベル切替・サイト管理）をユーザーが操作可能にする。

## 実装対象の機能

### 1. popup UI（軽量・即時操作）
- 全体 ON/OFF トグル → `setGlobalEnabled`
- 警告レベル B/C 切替 → `setWarningLevel`
- サイト個別 ON/OFF トグル → `toggleSite`
- options ページへのリンク → `chrome.runtime.openOptionsPage()`
- 200ms 表示要件のため settings のみを読む軽量初期化

### 2. options UI（サイト管理）
- 登録サイト一覧表示（domain / label / enabled / isDefault）
- 追加フォーム → `addSite`（isValid・重複エラーをユーザーに表示）
- 編集 → `updateSite`（domain/label の変更、再検証）
- 削除 → `removeSite`（初期4サイト含め全サイト一律に削除可能・特別扱いなし）
- 個別 ON/OFF トグル → `toggleSite`

### 3. popup ⇔ options 相互整合
- 一方の変更が `liveUpdate` 経由で他方へ即時反映（明示メッセージ不要）
- SW のキャッシュ（`subscribe`）にも反映され、ブロック挙動に即時影響

## 受け入れ条件

### popup UI
- [ ] 全体 OFF で対象サイトが素通し、ON で再ブロックされる
- [ ] B/C 切替が SW に反映される（C=リダイレクト）
- [ ] サイト個別 OFF で当該サイトのみ素通しされる
- [ ] options リンクから options ページが開く

### options UI
- [ ] 追加が popup 一覧へ即時反映される
- [ ] 無効ドメイン入力時にエラー表示され追加されない
- [ ] 重複ドメイン入力時にエラー表示される
- [ ] 編集・削除が反映される
- [ ] 初期4サイトも追加サイトと同様に編集・削除できる

### 相互整合
- [ ] popup の変更が options に即時反映、その逆も成立
- [ ] 設定変更後にブロック挙動が即座に変わる

### 品質
- [ ] `pnpm -F popup type-check` / `pnpm -F options type-check` が通過
- [ ] `pnpm lint` がエラー0
- [ ] `pnpm build` が成功

## 成功指標

- popup・options の両画面で P0 機能（全体/個別 ON/OFF・レベル切替・サイト管理）が完結する
- 両画面と SW が単一の `focusgateSettingsStorage` を介して常に一貫した状態を保つ

## スコープ外

以下はこのフェーズでは実装しません:

- レベルB 確認オーバーレイ（content-ui）— ステップ6
- E2E テスト — ステップ7
- デザインの作り込み（最低限の Tailwind スタイルに留める）

## 参照ドキュメント

- `docs/mvp-implementation-plan.md` - ステップ5
- `docs/functional-design.md` - 機能設計書（判定表・UI 要件）
- `docs/architecture.md` - 依存ルール（UI は storage 経由）
