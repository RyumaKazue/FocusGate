# 要求内容

## 概要

ステップ1で完成した `@extension/block-engine`（型・`STORAGE_KEY`・`DEFAULT_SETTINGS`・`DomainNormalizer`）を再利用し、`@extension/storage` に FocusGate 設定の永続化レイヤー `focusgateSettingsStorage` を追加する。`createStorage` 基盤で `chrome.storage.local` に `FocusGateSettings` を保存し、UI・SW が安全に設定を読み書きするための補助関数（全体ON/OFF・警告レベル・サイト CRUD）を提供する。

## 背景

`docs/mvp-implementation-plan.md` のステップ2に相当する。依存ルール上、UI（popup/options/content-ui）と background(SW) は `chrome.storage` を直接触らず、必ず `settingsStorage` 経由で設定を読み書きする。そのため、ボイラープレートの `example-theme-storage.ts` と同型で `createStorage` をラップしたストレージ実装を `@extension/storage` に用意し、後続のステップ3以降（manifest / blocked.html / SW / UI）が依存する「設定の単一窓口」を確立する。

ドメインの正規化・バリデーション・重複判定は block-engine の `DomainNormalizer` に集約済みのため、storage 側はこれを呼び出すだけで一貫したルールを保てる（型・定数も block-engine から import し循環を回避）。

## 実装対象の機能

### 1. `focusgateSettingsStorage` の作成
- `createStorage<FocusGateSettings>(STORAGE_KEY, DEFAULT_SETTINGS, { storageEnum: Local, liveUpdate: true })` を spread し、補助関数を付与
- `liveUpdate: true` により popup / options / content-ui / SW 間で状態が相互に同期する

### 2. 補助関数（設定操作 API）
- `setGlobalEnabled(value: boolean)` — 全体 ON/OFF
- `setWarningLevel(level: WarningLevel)` — 警告レベル B/C 切替
- `addSite({ domain, label? })` — `DomainNormalizer.normalize` + `isValid` 検証 → 正規化後の重複チェック → `crypto.randomUUID()` / `isDefault: false` / `enabled: true` で追加
- `updateSite(id, patch)` — 対象サイトを更新。`domain` を含む場合は再正規化・再検証・重複チェック（自分自身を除外）
- `removeSite(id)` — サイト削除
- `toggleSite(id)` — 当該サイトの `enabled` を反転

### 3. re-export と依存追加
- `packages/storage/lib/impl/index.ts` に `focusgate-settings-storage.js` を re-export
- `packages/storage/package.json` の dependencies に `@extension/block-engine: workspace:*` を追加

## 受け入れ条件

### focusgateSettingsStorage（基盤）
- [ ] `get()` の初期値が `DEFAULT_SETTINGS`（youtube/tiktok/instagram/facebook の4既定サイト）と一致する
- [ ] `BaseStorageType<FocusGateSettings>`（`get`/`set`/`getSnapshot`/`subscribe`）を満たす

### 補助関数
- [ ] `setGlobalEnabled(false)` で `globalEnabled` が false になる
- [ ] `setWarningLevel('C')` で `warningLevel` が 'C' になる
- [ ] `addSite({ domain: 'https://www.X.com/feed' })` で正規化された `x.com` が `enabled:true`/`isDefault:false`/UUID 付きで追加される
- [ ] `addSite` に不正ドメイン（`isValid=false`）を渡すと追加されずエラーになる
- [ ] `addSite` で正規化後に既存と重複するドメインはエラーになる
- [ ] `updateSite(id, { label })` でラベルのみ更新できる
- [ ] `updateSite(id, { domain })` で domain 変更時に再検証・重複チェックされる（自分自身は重複扱いしない）
- [ ] `removeSite(id)` で対象サイトが配列から消える
- [ ] `toggleSite(id)` で当該サイトの `enabled` が反転する

### 全体
- [ ] `pnpm -F @extension/storage ready` が成功（dist 生成・エラー無し）
- [ ] `pnpm -F @extension/storage type-check` / `lint` が通過
- [ ] `pnpm install` 後に `@extension/block-engine` への workspace 依存が解決される

## 成功指標

- UI/SW が `chrome.storage` を直接触らずに済む「設定の単一窓口」が確立し、ステップ3以降が即着手可能
- ドメイン正規化・バリデーション・重複判定が block-engine に一元化され、storage 側に重複ロジックがない

## スコープ外

以下はこのフェーズ（ステップ2）では実装しません:

- manifest 権限追加 / blocked.html = ステップ3
- SW のナビ監視・リダイレクト = ステップ4
- popup / options UI = ステップ5
- レベルB オーバーレイ = ステップ6
- storage の自動テスト（Vitest）の新規導入（MVP 範囲外。block-engine 側でロジックは検証済み）

## 参照ドキュメント

- `docs/mvp-implementation-plan.md` - MVP 実装計画（ステップ2: 108-130行）
- `docs/functional-design.md` - サイト管理・バリデーション仕様
- `docs/architecture.md` - 依存ルール（storage 経由アクセス）
- `docs/development-guidelines.md` - コーディング規約
