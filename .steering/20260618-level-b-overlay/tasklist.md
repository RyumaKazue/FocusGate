# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

---

## フェーズ1: 依存追加

- [x] `pages/content-ui/package.json` の dependencies に `@extension/block-engine: workspace:*` を追加（`BlockSite` 型の型のみ依存）
- [x] `pnpm install` で workspace リンクを解決

## フェーズ2: メッセージ型の定義

- [x] SW ⇔ content 共有のメッセージ型を定義（計画の `chrome-extension/src/background/messages.ts` ではなく **`packages/block-engine/lib/messages.ts`** に配置。理由: SW と content の両者が block-engine に型のみ依存しており、計画方針「型・定数は block-engine に集約し循環回避」に整合。chrome-extension 側に置くと content-ui から import できないため）
  - [x] `ShowWarningMessage = { type:'SHOW_WARNING'; site: BlockSite }`
  - [x] `WarningResultMessage = { type:'WARNING_RESULT'; action:'proceed'|'cancel'; domain: string }`
  - [x] `index.ts` から re-export ＋ `block-engine ready` で dist 反映

## フェーズ3: content-ui matches/focusgate 実装

- [x] `pages/content-ui/src/matches/focusgate/index.css` を新規作成（`@import '@extension/ui/global.css'`、all/example 踏襲）
- [x] オーバーレイ文言を i18n に追加（en/ko: `overlayHeading`/`overlayMessage`/`proceed`/`stopBrowsing`）＋型再生成
- [x] `pages/content-ui/src/matches/focusgate/App.tsx` を新規作成
  - [x] `useState<BlockSite | null>` で対象サイト保持、既定 `null`（非表示）
  - [x] `useEffect` で `chrome.runtime.onMessage` 登録、`SHOW_WARNING` 受信で site セット
  - [x] フルスクリーン固定オーバーレイ（サイト名 label ?? domain ＋「進む」「やめる」）
  - [x] 「進む」→ `sendMessage(WARNING_RESULT proceed, domain)` ＋ `setSite(null)`
  - [x] 「やめる」→ `sendMessage(WARNING_RESULT cancel, domain)` ＋ `history.back()`
  - [x] アンマウント時に `onMessage` リスナを解除
- [x] `pages/content-ui/src/matches/focusgate/index.tsx` を新規作成（`initAppWithShadow({ id:'focusgate-overlay', app:<App/>, inlineCss })`）

## フェーズ4: SW navigation.ts 拡張

- [x] インメモリ許可マップ `allowMap = new Map<number, Set<string>>()` と `isAllowed(tabId, domain)` / `allow(tabId, domain)` を実装
- [x] `onBeforeNavigate`（レベルC）にリダイレクト前の `isAllowed` ガードを追加（許可済みは素通し）
- [x] `handleCompleted(details)` を実装（frame0、`blocked && level==='B'` かつ `!isAllowed` で `chrome.tabs.sendMessage(SHOW_WARNING)`、失敗は try/catch）
- [x] `chrome.runtime.onMessage` で `WARNING_RESULT(proceed)` → `allow(sender.tab.id, domain)`
- [x] `chrome.tabs.onRemoved` で `allowMap.delete(tabId)`
- [x] `registerNavigation()` に `onCompleted` / `onMessage` / `onRemoved` のリスナ登録を追加

## フェーズ5: manifest 編集

- [x] `chrome-extension/manifest.ts` の `content_scripts` に `{ matches:['http://*/*','https://*/*'], js:['content-ui/focusgate.iife.js'] }` を追加

## フェーズ6: 品質チェックと修正

- [x] `pnpm build` が成功し `dist/content-ui/focusgate.iife.js` が生成される（turbo 21/21 成功、focusgate.iife.js 564KB 出力）
- [x] `dist/manifest.json` の content_scripts に focusgate エントリが含まれることを確認（`content-ui/focusgate.iife.js` あり）。`background.js` に `onCompleted`/`onRemoved`/`SHOW_WARNING`、`focusgate.iife.js` に `SHOW_WARNING`/`WARNING_RESULT` がバンドルされていることも確認
- [x] lint エラー0（content-ui / chrome-extension / block-engine いずれも 3/3 成功・エラー0）
- [x] 編集ファイル由来の型エラー0（chrome-extension/block-engine の type-check は完全通過。content-ui は `matches/focusgate` 由来エラー0で、残存は `@extension/ui` の `"types":"index.ts"` 既存事象のみ＝スコープ外）

## フェーズ7: 手動実機確認

- [x] レベルB 設定で対象サイト → 確認オーバーレイ表示、サイト名表示 ※ユーザー実機確認済み
- [x] 「やめる」で前ページへ離脱
- [x] 「進む」で閲覧でき、同一タブ再遷移で再発動しない
- [x] 別タブ／タブ閉じ後は再確認される
- [x] レベルC は引き続き blocked.html へリダイレクト（非回帰）
- [x] 全体OFF / 個別OFF / 対象外サイトは素通し

## フェーズ8: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-18

### 計画と実績の差分

**計画と異なった点**:
- SW⇔content 共有メッセージ型の置き場所を、計画の `chrome-extension/src/background/messages.ts` から **`packages/block-engine/lib/messages.ts`** に変更。content-ui は chrome-extension を import できず、両者が block-engine に型のみ依存するため。計画方針「型・定数は block-engine に集約し循環回避」に整合。
- オーバーレイ文言を i18n（en/ko: `overlayHeading`/`overlayMessage`/`proceed`/`stopBrowsing`）として追加（計画では明示なし）。

**新たに必要になったタスク**:
- オーバーレイ用 i18n キーの追加＋型再生成。

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- なし。

### 学んだこと

**技術的な学び**:
- レベルB は content script が描画後注入のため `onCompleted` で発火、レベルC は描画前の `onBeforeNavigate` で遮断、という発火点の使い分けが要。判定は両者とも `BlockEngine.decide` の純関数を共用し重複ロジックを作らない。
- content-ui は `matches/<name>/index.tsx` を置くだけで `getContentScriptEntries` が自動検出し `<name>.iife.js` を出力するため build.mts 変更不要。
- オーバーレイは全ページ常駐だが既定 `null` 描画で空 Shadow コンテナのみ。`SHOW_WARNING` 受信時だけ UI を構築する設計で常駐コストを最小化。
- 再発動防止は SW モジュールスコープの `Map<tabId, Set<domain>>`。MV3 SW 揮発時は失効するが「再確認が出るだけ」で安全側。

**プロセス上の改善点**:
- 共有型の置き場所をアーキテクチャ原則（型は block-engine に集約）に照らして決め、計画からの逸脱理由を tasklist に明記した。

### 次回への改善提案
- ドメイン変更時の一時許可破棄は本ステップ未実装だったため、別タスク（`20260618-tab-permission-domain-scope`）として切り出して対応した。スコープ境界を明確にできた。
