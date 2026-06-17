# FocusGate MVP 実装計画

## Context

FocusGate は YouTube/SNS 等の集中阻害サイトを「関所」で制御する Chrome 拡張（MV3）。設計ドキュメント（`docs/` 配下の PRD / 機能設計 / アーキテクチャ / 用語集 / リポジトリ構造）は完成度が高く、MVP の P0 機能・データモデル・判定アルゴリズム・コンポーネント配置まで確定済み。一方コードは chrome-extension-boilerplate-react-vite のボイラープレートのままで、FocusGate 固有実装はほぼ 0。本計画はこの設計を実装に落とし、MVP（P0 6機能）を完成させる。

**MVP の P0 機能**:
1. ブロック対象サイト管理（初期4サイト＋カスタム追加/編集/削除, ドメイン部分一致でサブドメイン対応, バリデーション）
2. 警告/ブロック発動（globalEnabled かつ site.enabled 時のみ）
3. 警告レベル全体共通 B/C（既定 B）
4. 全体 ON/OFF＋サービス個別 ON/OFF
5. chrome.storage.local 永続化（DEFAULT_SETTINGS シード）
6. popup＋options の相互整合 UI

## 確定方針

1. **縦スライス優先**: まず `block-engine → settings-storage → manifest → SW → blocked.html` を通し、「対象サイトを開くとレベルCでブロックされる」最小縦スライスを最初に実機で動かす。その後 UI を肉付け。
2. **レベルC先**: 完全ブロック（`onBeforeNavigate` → `chrome.tabs.update` で blocked.html リダイレクト）を先に。レベルB（content-ui の Shadow DOM オーバーレイ＋同一タブ再発動防止）は後。
3. **block-engine のみ TDD**: 純粋ロジックだけ Vitest でテスト駆動。UI/SW は手動確認。

## データモデル（確定）

```ts
type WarningLevel = 'B' | 'C';

interface BlockSite {
  id: string;
  domain: string;
  label: string | null;
  enabled: boolean;
  isDefault: boolean;
}

interface FocusGateSettings {
  version: number;
  globalEnabled: boolean;
  warningLevel: WarningLevel;
  sites: BlockSite[];
}

type BlockDecision =
  | { blocked: false }
  | { blocked: true; level: WarningLevel; site: BlockSite };
```

初期値 `DEFAULT_SETTINGS`: version=1, globalEnabled=true, warningLevel='B', sites=[youtube.com / tiktok.com / instagram.com / facebook.com]（全て enabled:true, isDefault:true, id=`crypto.randomUUID()`）。

## 依存ルール（厳守）

```
@extension/block-engine（最下層・chrome.* 非依存・他 @extension/* 非依存）
   ↑ 型のみ依存
@extension/storage
   ↑
UI（popup/options/content-ui） / background(SW)
```

UI・background は `chrome.storage` を直接触らず必ず `settingsStorage` 経由。型・定数は block-engine に集約し循環回避。

---

## ステップ 0: `@extension/block-engine` パッケージ骨格

`packages/storage`（`tsc -b` でビルドする純TSパッケージ）を雛形に新規作成。Vite/tsup は使わず `tsc -b`。

**新規作成**:
- `packages/block-engine/package.json` — `packages/storage/package.json` を踏襲。`name:"@extension/block-engine"`, scripts に `ready:"tsc -b"` と `test:"vitest run"`、devDeps に `@extension/tsconfig: workspace:*` と `vitest`
- `packages/block-engine/tsconfig.json`
- `packages/block-engine/index.mts`
- `packages/block-engine/lib/index.ts`
- `packages/block-engine/lib/types.ts` — 上記データモデル
- `packages/block-engine/lib/constants.ts` — `STORAGE_KEY='focusgate-settings'` ＋ `DEFAULT_SETTINGS`
- `packages/block-engine/lib/domain-normalizer.ts`（雛形）
- `packages/block-engine/lib/block-engine.ts`（雛形）

**編集**:
- `turbo.json` の `tasks` に `test`（`{ "dependsOn": ["^ready"], "cache": false }`）を追加

**再利用**: `packages/storage/{package.json,tsconfig.json,index.mts}`、`packages/tsconfig/module.json`

**検証**: `pnpm install` → `pnpm -F @extension/block-engine ready` が dist 生成・エラー無し。`pnpm type-check` 通過

---

## ステップ 1: BlockEngine / DomainNormalizer を TDD

Vitest 設定は block-engine 内に閉じる。

**新規作成**:
- `packages/block-engine/vitest.config.ts`（`environment:'node'`）
- `packages/block-engine/lib/domain-normalizer.spec.ts`
- `packages/block-engine/lib/block-engine.spec.ts`

**実装**:
- `DomainNormalizer.normalize(input)`: trim → スキーム有なら `new URL().hostname` / 無ならパス除去 → 小文字 → 先頭 `www.` 除去 → 末尾ドット・ポート除去
- `DomainNormalizer.isValid(domain)`: ラベル1個以上・英数字ハイフン・TLD 2文字以上
- `BlockEngine.decide(url, settings)`:
  1. `globalEnabled===false` または非 http(s) → `{blocked:false}`
  2. host 正規化
  3. `matchSite`（host が `site.domain` と完全一致 or `"."+site.domain` で終端、かつ `site.enabled`）で最初にマッチした有効サイト → `{blocked:true, level: settings.warningLevel, site}`

**テストケース**: functional-design の判定表（全体OFF / サービスOFF / `m.youtube.com`○ / `music.youtube.com`○ / `notyoutube.com`× / `chrome://`×）と正規化表（`www.YouTube.com/feed`→`youtube.com` 等）

**検証（自動）**: `pnpm -F @extension/block-engine test` 全グリーン。**縦スライスの頭脳が完成**

---

## ステップ 2: `focusgate-settings-storage`（@extension/storage 編集）

`example-theme-storage.ts` と同型で `createStorage` 基盤＋補助関数。

**新規作成**:
- `packages/storage/lib/impl/focusgate-settings-storage.ts`
  - `createStorage<FocusGateSettings>(STORAGE_KEY, DEFAULT_SETTINGS, { storageEnum: Local, liveUpdate: true })` を spread
  - 補助関数:
    - `setGlobalEnabled(boolean)`
    - `setWarningLevel('B' | 'C')`
    - `addSite({domain, label?})` — normalize + isValid 検証 ＋ 正規化後重複チェック ＋ `crypto.randomUUID()` / `isDefault:false` / `enabled:true` で push
    - `updateSite(id, patch)` — domain 変更時は再検証
    - `removeSite(id)`
    - `toggleSite(id)`

**編集**:
- `packages/storage/lib/impl/index.ts` に re-export 追加
- `packages/storage/package.json` に `@extension/block-engine: workspace:*` 追加

**再利用**: `createStorage` / `StorageEnum`（`packages/storage/lib/base`）、`example-theme-storage.ts` 雛形、block-engine の `STORAGE_KEY` / `DEFAULT_SETTINGS` / 型 / `DomainNormalizer`

**検証**: `pnpm -F @extension/storage ready` 成功

---

## ステップ 3: manifest 権限追加 ＋ blocked.html（レベルC の出口）

**新規作成**:
- `chrome-extension/public/blocked.html` — 静的 HTML（React 不要、CSP 遵守）。`?site=` クエリを `location.search` でパースして対象サイト名を表示。`public/` 配置物は dist 直下へコピーされる（`content.css` の前例）

**編集**:
- `chrome-extension/manifest.ts`
  - `permissions` に `'webNavigation'` 追加
  - `web_accessible_resources[0].resources` に `'blocked.html'` 追加

**検証**: `pnpm dev` → Chrome に dist 読込 → `chrome-extension://<id>/blocked.html?site=youtube.com` 直接アクセスで表示確認

---

## ステップ 4: SW でナビ監視 → レベルC リダイレクト（縦スライス貫通）

**新規作成**:
- `chrome-extension/src/background/navigation.ts`
  - 設定キャッシュ: モジュールスコープ `cache`。初回 `settingsStorage.get()`、`settingsStorage.subscribe(() => cache = settingsStorage.getSnapshot())` で更新。判定時 `cache ?? await settingsStorage.get()` フォールバック
  - `registerNavigation()`:
    - `chrome.webNavigation.onBeforeNavigate`（`frameId===0` のみ）
    - `BlockEngine.decide` が `blocked && level==='C'` のとき `chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked.html')+'?site='+encodeURIComponent(site.label ?? site.domain) })`
    - レベルB はここでは何もしない（ステップ6で onCompleted 実装、受け皿コメントを残す）

**編集**:
- `chrome-extension/src/background/index.ts` に `registerNavigation()` 追加（theme サンプルは除去）
- `chrome-extension/package.json` に `@extension/block-engine: workspace:*` 追加

**再利用**: `settingsStorage`、`BlockEngine.decide`、`webextension-polyfill`（既存）

**検証（縦スライス完了判定）**:
1. デバッグで `setWarningLevel('C')` → youtube.com を開く → `blocked.html?site=YouTube` にリダイレクト
2. `globalEnabled=false` で素通し

**確定方針1の達成点**

---

## ステップ 5: popup / options UI（相互整合・個別ON/OFF）

`useStorage(settingsStorage)` で `liveUpdate` 経由の相互整合（明示メッセージ不要）。

**編集（popup）**:
- `pages/popup/src/Popup.tsx` — theme サンプル置換
  - 全体ON/OFFトグル → `setGlobalEnabled`
  - レベルB/C 切替 → `setWarningLevel`
  - サイト個別ON/OFF → `toggleSite`
  - options リンク → `chrome.runtime.openOptionsPage()`
  - 200ms 要件のため settings のみ読む軽量初期化

**編集（options）**:
- `pages/options/src/Options.tsx` — リスト表示／追加フォーム（`addSite`、isValid エラー表示）／編集（`updateSite`）／削除（`removeSite`、isDefault ガード方針があれば反映）

**再利用**:
- `useStorage`・`withErrorBoundary` / `withSuspense`（`@extension/shared`）
- `cn` / `LoadingSpinner` / `ErrorDisplay`（`@extension/ui`）
- 汎用トグルは素の `<button>`+`cn` で自前実装（`ToggleButton` は theme 専用）
- 文言追加時は `packages/i18n/locales/{en,ko}/messages.json`

**検証（手動）**:
- popup 全体OFF→素通し / ON→再ブロック、B/C 切替が SW に反映（C=リダイレクト）
- options 追加が popup 一覧に即時反映、無効ドメインでエラー、個別OFF で当該サイトのみ素通し

---

## ステップ 6: レベルB 確認オーバーレイ（content-ui）＋ 再発動防止

レベルB は content script 注入済み前提のため `onCompleted` で発火。

**新規作成（content-ui）**:
- `pages/content-ui/src/matches/focusgate/index.tsx`
  - `initAppWithShadow({ id:'focusgate-overlay', app:<Overlay/>, inlineCss })`
- `pages/content-ui/src/matches/focusgate/App.tsx`
  - `chrome.runtime.onMessage` で `SHOW_WARNING`（site情報）受信時のみマウント
  - 「進む」→ `sendMessage({type:'WARNING_RESULT', action:'proceed'})` ＋ 解除
  - 「やめる」→ `cancel` ＋ `history.back()`
- `pages/content-ui/src/matches/focusgate/index.css`

`build.mts` が `matches/` を自動検出するためビルド変更不要（出力 `focusgate.iife.js`）。

**編集（manifest）**:
- `content_scripts` に `{ matches:['http://*/*','https://*/*'], js:['content-ui/focusgate.iife.js'] }` 追加

**編集（background/navigation.ts）**:
- `chrome.webNavigation.onCompleted`（frameId 0）→ `decide` が `blocked && level==='B'` かつ一時許可マップに無ければ `chrome.tabs.sendMessage(tabId, {type:'SHOW_WARNING', site})`
- インメモリ `Map<number, Set<string>>`（tabId → 許可ドメイン）
- `chrome.runtime.onMessage` の `proceed` で登録、`chrome.tabs.onRemoved` で削除
- 許可済みタブ+ドメインは B/C とも素通し

**再利用**: `initAppWithShadow`（`@extension/shared`）、既存 content-ui `matches/all` 構成・`build.mts`・inlineCss import、`BlockEngine.decide`

**検証（手動）**:
- レベルB で youtube → 確認オーバーレイ → 「やめる」で離脱、「進む」で閲覧でき**同一タブ再遷移では再発動しない**（別タブ／タブ閉じ後は再確認）
- レベルC は引き続きリダイレクト

---

## ステップ 7（任意・後追い）: E2E

`tests/e2e/specs/block-levels.test.ts` を既存 `page-popup.test.ts` パターンで追加（B/C・全体OFF素通し）。`pnpm e2e`。MVP 必須ではない。

---

## 実装順サマリ

| 順 | 内容 | 主な新規/編集 | 検証 |
|---|---|---|---|
| 0 | block-engine 骨格＋turbo test | pkg/tsconfig/index/types/constants 新規, turbo.json | ready / type-check |
| 1 | engine/normalizer TDD | *.spec.ts, vitest.config | `-F block-engine test` 自動 |
| 2 | settings-storage | focusgate-settings-storage.ts, impl/index, pkg | ready / 型 |
| 3 | manifest + blocked.html | blocked.html, manifest.ts | blocked.html 直接表示 |
| 4 | SW onBeforeNavigate → C | navigation.ts, background/index, pkg | **縦スライス実機: youtube で C** |
| 5 | popup / options UI | Popup.tsx, Options.tsx | 相互整合・個別ON/OFF 手動 |
| 6 | レベルB ＋ 再発動防止 | content-ui matches/focusgate, navigation.ts, manifest | B 確認・進む後非再発動 手動 |
| 7 | E2E（任意） | block-levels.test.ts | `pnpm e2e` |

## リスク・注意

- `chrome-extension/package.json` の既存 `test:"vitest run"` は vitest 未導入。vitest は block-engine にのみ導入し、chrome-extension の test は据え置き
- `crypto.randomUUID()` は SW / ブラウザ / Node22 すべて利用可（外部依存ゼロ）
- SPA 内遷移（YouTube Shorts の pushState 等）は MVP スコープ外。フルページ遷移のみ
- blocked.html 自体は非対象サイトなので再ブロックされない（matchSite が extension スキームで非マッチ）

## 全体検証（MVP 完了確認）

1. `pnpm install && pnpm -F @extension/block-engine test`（自動テスト全グリーン）
2. `pnpm dev` で dist を Chrome（一時プロファイル）に読込
3. popup: 全体ON/OFF・B/C 切替・個別ON/OFF が即反映。options: 追加/編集/削除＋バリデーション、popup と相互整合
4. レベルC で対象サイト → blocked.html リダイレクト。レベルB で確認オーバーレイ → 進む/やめる、進む後は同一タブ再発動なし
5. 全体OFF / 個別OFF / 対象外サイトは素通し。再起動後も設定保持
