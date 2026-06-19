# 設計書

## アーキテクチャ概要

レベルB は「SW がナビ完了を検知 → content script のオーバーレイをメッセージで起動 → ユーザー操作結果を SW へ返す」という双方向メッセージ連携で実現する。レベルC（`onBeforeNavigate` 即リダイレクト）とは発火タイミングが異なる（content script は描画後注入のため `onCompleted` を使う）。再発動防止は SW のインメモリ許可マップで行う。

```
[ナビゲーション]
  ├─ onBeforeNavigate(frame0) ─ decide ─ blocked&C & 未許可 → tabs.update(blocked.html)   ※既存
  └─ onCompleted(frame0)      ─ decide ─ blocked&B & 未許可 → tabs.sendMessage(SHOW_WARNING, site)
                                                                      │
                                          content-ui focusgate.iife.js（全ページ常駐・既定は非表示）
                                                                      │ SHOW_WARNING 受信で表示
                                                            ┌─────────┴─────────┐
                                                         「進む」              「やめる」
                                          sendMessage(WARNING_RESULT proceed)   history.back()
                                                            │
                                          SW: allowMap[tabId].add(domain)（以後 B/C 素通し）
  onRemoved(tabId) → allowMap.delete(tabId)
```

## コンポーネント設計

### 1. メッセージ型（`chrome-extension/src/background/messages.ts` 新規、または navigation.ts 内に定義）

**責務**: SW ⇔ content の型安全なメッセージ契約

```ts
// SW → content
type ShowWarningMessage = { type: 'SHOW_WARNING'; site: BlockSite };
// content → SW
type WarningResultMessage = { type: 'WARNING_RESULT'; action: 'proceed' | 'cancel'; domain: string };
```

**実装の要点**: `BlockSite` は `@extension/block-engine` の型を再利用。content 側と共有するため、共通の型定義を1か所に置き双方から import する（content-ui に block-engine を型のみ依存追加）。

### 2. SW: navigation.ts 拡張

**責務**: レベルB の onCompleted 発火、一時許可マップ管理

**実装の要点**:
- 既存の `cache` / `getSettings` / `onBeforeNavigate(C)` は維持
- インメモリ `const allowMap = new Map<number, Set<string>>()`
- `isAllowed(tabId, domain)`: `allowMap.get(tabId)?.has(domain) ?? false`
- `allow(tabId, domain)`: 無ければ Set 作成して add
- `onBeforeNavigate`（C）: リダイレクト前に `isAllowed` なら素通し（許可済みは B/C とも通す方針）
- `handleCompleted(details)`: frame0、`decide` が `blocked && level==='B'` かつ `!isAllowed` → `chrome.tabs.sendMessage(tabId, { type:'SHOW_WARNING', site })`（送信失敗は try/catch で握りつぶす：content 未注入ページ等）
- `chrome.runtime.onMessage`: `WARNING_RESULT` 受信時、`action==='proceed'` なら `allow(sender.tab.id, msg.domain)`。`cancel` は SW 側は何もしない（離脱は content の history.back() が担う）
- `chrome.tabs.onRemoved`: `allowMap.delete(tabId)`
- `registerNavigation()` に `onCompleted` / `onMessage` / `onRemoved` のリスナ登録を追加

### 3. content-ui: matches/focusgate

**責務**: SHOW_WARNING 受信時のみオーバーレイを表示し、操作結果を SW へ返す

**実装の要点**:
- `matches/focusgate/index.tsx`: `initAppWithShadow({ id:'focusgate-overlay', app:<App/>, inlineCss })`（`matches/` 自動検出で `focusgate.iife.js` 出力。build.mts 変更不要）
- `matches/focusgate/App.tsx`:
  - 既定は `null` を返し非表示。`useState<BlockSite | null>` で対象サイトを保持
  - `useEffect` で `chrome.runtime.onMessage` を登録。`SHOW_WARNING` 受信で site をセットして表示
  - 「進む」→ `chrome.runtime.sendMessage({ type:'WARNING_RESULT', action:'proceed', domain: site.domain })` ＋ `setSite(null)`
  - 「やめる」→ `sendMessage({ ...action:'cancel'... })` ＋ `history.back()`
  - full-screen の固定オーバーレイ（Shadow DOM 内なのでホストの CSS と干渉しない）
- `matches/focusgate/index.css`: Tailwind ディレクティブ（既存 all/example の index.css を踏襲）

## データフロー

### レベルB 確認 → 進む
```
1. 対象サイトを開く → onCompleted(frame0)
2. decide = {blocked:true, level:'B', site}、isAllowed=false
3. SW → content: SHOW_WARNING(site)
4. content: オーバーレイ表示。ユーザー「進む」
5. content → SW: WARNING_RESULT(proceed, domain)
6. SW: allowMap[tabId].add(domain)、content はオーバーレイ解除
7. 以後 同一タブ・同一ドメインは isAllowed=true で素通し
```

### タブを閉じる
```
1. onRemoved(tabId) → allowMap.delete(tabId)
2. 別タブ／開き直しでは許可が無く再確認
```

## エラーハンドリング戦略
- `chrome.tabs.sendMessage` / `chrome.runtime.sendMessage` の失敗（受信側不在）は try/catch で握りつぶし、監視全体を止めない（既存 onBeforeNavigate と同方針）
- content 側 onMessage ハンドラは `message.type` で厳格に分岐し、未知メッセージは無視

## テスト戦略
- ユニットテスト: なし（block-engine のみ TDD。content/SW は手動確認）
- 手動: レベルB 確認→進む/やめる、再発動防止、レベルC 非回帰、各種素通し

## 依存ライブラリ
新規ライブラリ追加なし。`pages/content-ui/package.json` に `@extension/block-engine: workspace:*`（`BlockSite` 型の型のみ依存）を追加。

## ディレクトリ構造
```
pages/content-ui/src/matches/focusgate/index.tsx   （新規）
pages/content-ui/src/matches/focusgate/App.tsx     （新規）
pages/content-ui/src/matches/focusgate/index.css   （新規）
pages/content-ui/package.json                       （編集: block-engine 依存追加）
chrome-extension/src/background/navigation.ts       （編集: onCompleted/allowMap/onMessage/onRemoved）
chrome-extension/manifest.ts                         （編集: content_scripts に focusgate.iife.js 追加）
```

## 実装の順序
1. content-ui に block-engine 依存追加 ＋ `pnpm install`
2. content-ui matches/focusgate（index.tsx / App.tsx / index.css）新規作成
3. navigation.ts に allowMap・onCompleted・onMessage・onRemoved を追加（onBeforeNavigate に isAllowed ガード）
4. manifest.ts の content_scripts に focusgate エントリ追加
5. 品質チェック（build / lint / 型）
6. 手動実機確認

## セキュリティ考慮事項
- オーバーレイは Shadow DOM に隔離しホストページの DOM/CSS と干渉させない
- サイト名は `textContent`（React の既定エスケープ）で表示し XSS を防ぐ
- メッセージは `type` で厳格分岐し、想定外メッセージを処理しない

## パフォーマンス考慮事項
- content script は全ページ常駐だが、既定は `null` レンダリングで Shadow ルートに空コンテナを置くのみ。SHOW_WARNING 受信時だけ UI を構築
- 判定は SW のキャッシュ設定で行い storage I/O を最小化（既存機構を流用）

## 将来の拡張性
- サイト別レベルや許可の有効期限などは allowMap の値を拡張する形で対応可能
- SPA 遷移追従は `onHistoryStateUpdated` を後追いで足せる構造
