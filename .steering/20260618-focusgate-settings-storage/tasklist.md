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

## フェーズ1: 依存追加とリンク

- [x] `packages/storage/package.json` の dependencies に `@extension/block-engine: workspace:*` を追加
- [x] `pnpm install` で workspace リンクを解決し、エラーが出ないことを確認

## フェーズ2: focusgate-settings-storage の実装

- [x] `packages/storage/lib/impl/focusgate-settings-storage.ts` を新規作成
  - [x] block-engine から型・定数・正規化を import（`FocusGateSettings` / `WarningLevel` / `BlockSite` / `STORAGE_KEY` / `DEFAULT_SETTINGS` / `DomainNormalizer`）
  - [x] `AddSiteInput`（`{ domain: string; label?: string }`）と `FocusGateSettingsStorageType`（`BaseStorageType<FocusGateSettings>` + 補助関数）の型を定義
  - [x] `createStorage<FocusGateSettings>(STORAGE_KEY, DEFAULT_SETTINGS, { storageEnum: Local, liveUpdate: true })` を生成
  - [x] `setGlobalEnabled(value)` を実装
  - [x] `setWarningLevel(level)` を実装
  - [x] `addSite({domain,label})` を実装（normalize → isValid 検証 → 重複チェック → UUID/isDefault:false/enabled:true で追加）
  - [x] `updateSite(id, patch)` を実装（domain 変更時は再正規化・再検証・重複チェックで自分を除外）
  - [x] `removeSite(id)` を実装
  - [x] `toggleSite(id)` を実装
  - [x] `export const focusgateSettingsStorage` を spread 形式で公開

## フェーズ3: 公開 API への接続

- [x] `packages/storage/lib/impl/index.ts` に `export * from './focusgate-settings-storage.js';` を追加

## フェーズ4: 品質チェックと修正

- [x] `pnpm -F @extension/storage ready` が成功（block-engine の `index.mts` 型解決で `references` 追加は不要だった）
- [x] `pnpm -F @extension/storage type-check` が通過
- [x] `pnpm -F @extension/storage lint` がエラー0
- [x] 受け入れ条件（requirements.md）を実装が満たしているかセルフレビュー

## フェーズ5: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-18

### 計画と実績の差分

**計画と異なった点**:
- **`tsconfig.json` の `references` 追加は不要だった**。block-engine が `types: "index.mts"`（ソース直指し）を公開しているため、`@extension/block-engine` の import は moduleResolution（node_modules シンボリックリンク）で型解決でき、`tsc -b` の project references を追加せずに `ready` が成功した。design.md で「必要なら追加」としていた保険は発動せず。
- **lint の `import-x/exports-last` 対応**。型・const を inline `export` すると「export はファイル末尾に集約」ルールに抵触したため、型と `focusgateSettingsStorage` を非 export で宣言し、末尾に `export { ... }` / `export type { ... }` を集約する形へ変更（example-theme-storage が単一末尾 export だったのと同じ思想）。

**新たに必要になったタスク**:
- `UpdateSitePatch` 型の明示定義。当初 `updateSite` の `patch` を曖昧にしていたが、`Partial<Pick<BlockSite, 'domain' | 'label' | 'enabled'>>` として型安全にした。

**技術的理由でスキップしたタスク**:
- なし。全タスク完了。

### 学んだこと

**技術的な学び**:
- workspace 内の純TSパッケージが `types` にソースの `index.mts` を向けている場合、依存側は project references 無しでも型解決できる。`dist` ビルドの順序整合だけ turbo（`^ready`）が担保すればよい。
- バリデーション（`normalizeAndValidate`）は `storage.set` の updater **外側**で先に実行し、正規化済み値を closure で持ち込む構成にした。これにより、不正入力時は storage を一切触らずに早期 throw でき、重複チェックだけは最新 `current` を見るため updater 内に置く、という責務分割ができた。
- `import-x/exports-last` 規約下では「宣言は非 export → 末尾で集約 export」がこのリポジトリの定石。

**プロセス上の改善点**:
- ステップ1の振り返りで予告した通り block-engine の `STORAGE_KEY`/`DEFAULT_SETTINGS`/型/`DomainNormalizer` をそのまま再利用でき、storage 側にロジック重複ゼロを達成。依存ルール（storage → block-engine の一方向）が綺麗に効いた。
- モード1での設計判断（型の置き場所を base ではなく impl に置く）が、base を block-engine 非依存に保つうえで正しく機能した。

### 次回への改善提案
- ステップ3（manifest 権限＋blocked.html）は storage 非依存の静的作業。続くステップ4で本ステップの `focusgateSettingsStorage` を SW のナビ監視キャッシュに繋ぎ、縦スライスを実機貫通させる。`subscribe`/`getSnapshot` を使ったキャッシュ更新が想定通り動くかをステップ4で実機確認する。
- 補助関数の throw メッセージ（`INVALID_DOMAIN`/`DUPLICATE_DOMAIN`/`SITE_NOT_FOUND`）はステップ5の options UI で i18n 文言にマッピングする前提。文言追加時は `packages/i18n/locales/{en,ko}/messages.json` を更新する。
