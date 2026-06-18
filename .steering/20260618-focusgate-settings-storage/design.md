# 設計書

## アーキテクチャ概要

`@extension/storage` に `focusgateSettingsStorage` を追加する。これはボイラープレートの `example-theme-storage.ts` と同型で、`createStorage` の戻り値を spread し、FocusGate 固有の補助関数を付与したオブジェクト。型・定数・正規化ロジックは最下層の `@extension/block-engine` から import する（依存は一方向: storage → block-engine）。

```
UI(popup/options/content-ui) / SW
        │ 読み書きは必ず経由
        ▼
focusgateSettingsStorage  ──(型のみ/関数)──▶ @extension/block-engine
   │  (createStorage ラップ)                  (FocusGateSettings, STORAGE_KEY,
   ▼                                            DEFAULT_SETTINGS, DomainNormalizer)
chrome.storage.local
```

## コンポーネント設計

### 1. focusgate-settings-storage.ts（`packages/storage/lib/impl/`）

**責務**:
- `FocusGateSettings` を `chrome.storage.local` に永続化する単一窓口
- 設定操作の補助関数（バリデーション含む）を提供

**実装の要点**:
- `createStorage<FocusGateSettings>(STORAGE_KEY, DEFAULT_SETTINGS, { storageEnum: StorageEnum.Local, liveUpdate: true })` を生成し `const storage` に保持
- `export const focusgateSettingsStorage = { ...storage, setGlobalEnabled, setWarningLevel, addSite, updateSite, removeSite, toggleSite }`
- 各補助関数は `storage.set(current => ...)` の updater 形式で `current` を読み、`structuredClone` ないしスプレッドで新オブジェクトを構築（直接 mutate しない）
- 型: 戻り値の形を明示するため `FocusGateSettingsStorageType = BaseStorageType<FocusGateSettings> & { ...補助関数のシグネチャ }` をこのファイル内（または `lib/impl`）で定義し、`focusgateSettingsStorage` に注釈。`base/types.ts` は block-engine 非依存に保ちたいため、本型定義は impl 側に置く
- `AddSiteInput = { domain: string; label?: string }` を定義

**補助関数の詳細**:

| 関数 | 処理 |
|---|---|
| `setGlobalEnabled(value)` | `set(c => ({ ...c, globalEnabled: value }))` |
| `setWarningLevel(level)` | `set(c => ({ ...c, warningLevel: level }))` |
| `addSite({domain,label})` | `normalize` → `isValid` 不合格なら throw → 正規化後 domain が既存 `sites` に存在すれば throw → `{ id: crypto.randomUUID(), domain: normalized, label: label ?? null, enabled: true, isDefault: false }` を push |
| `updateSite(id, patch)` | 対象を検索（無ければ throw）。`patch.domain` があれば normalize+isValid+重複チェック（**自分の id を除外**）。`label`/`enabled` はそのまま反映。新配列で置換 |
| `removeSite(id)` | `sites.filter(s => s.id !== id)` |
| `toggleSite(id)` | 対象の `enabled` を反転（その他は不変） |

### 2. impl/index.ts（編集）

**責務**: storage パッケージの公開 API に re-export を追加

**実装の要点**:
- `export * from './focusgate-settings-storage.js';` を追加（既存の theme re-export はそのまま）

### 3. package.json（編集）

**責務**: block-engine への workspace 依存を宣言

**実装の要点**:
- `"dependencies": { "@extension/block-engine": "workspace:*" }` を追加（現状 dependencies が無いため新設）
- block-engine は `tsc -b` 成果物（`dist`）と `index.mts` 型を公開しているため、`pnpm install` でリンクされれば import 解決可能。`tsconfig` の project references 追加が必要かは `ready` で確認し、必要なら `tsconfig.json` に `references` を追加

## データフロー

### addSite の検証フロー
```
入力 { domain, label? }
  ▼ DomainNormalizer.normalize(domain) → normalized
  ▼ DomainNormalizer.isValid(normalized) === false → throw Error('invalid domain')
  ▼ sites.some(s => s.domain === normalized) → throw Error('duplicate domain')
  ▼ sites に { id, domain: normalized, label ?? null, enabled: true, isDefault: false } を追加
  ▼ storage.set で永続化 → liveUpdate で各コンテキストへ同期
```

### updateSite（domain 変更時）
```
patch.domain あり
  ▼ normalize → isValid 不合格なら throw
  ▼ sites.some(s => s.id !== id && s.domain === normalized) → throw（自分は除外）
  ▼ 対象を { ...site, ...patch, domain: normalized } で置換
```

## エラーハンドリング戦略

### カスタムエラークラス
- MVP では不要。`addSite`/`updateSite` は不正・重複時に `Error`（メッセージで種別を判別可能に: 例 `'INVALID_DOMAIN'` / `'DUPLICATE_DOMAIN'`）を throw
- 呼び出し側（ステップ5 の options UI）が try/catch でエラー表示する前提。メッセージ文言は UI 側で i18n 化

### エラーハンドリングパターン
- 検証は「追加・更新の確定前」に実施し、不正時は storage を変更しない（throw で中断）
- `updateSite`/`removeSite`/`toggleSite` で id 不一致時は throw（呼び出し側の不具合検知）

## テスト戦略

### ユニットテスト
- 本ステップでは Vitest は新規導入しない（storage は `chrome.storage` 依存でモックコストが高く、MVP スコープ外）。正規化・バリデーションの純ロジックは block-engine 側で検証済み
- 検証は `pnpm -F @extension/storage ready` / `type-check` / `lint` の通過と、ステップ4以降の実機確認で担保

### 統合テスト
- なし（ステップ4の縦スライス実機・ステップ5の UI 手動確認で担保）

## 依存ライブラリ

- 追加: `@extension/block-engine: workspace:*`（dependencies）
- それ以外の追加なし（`createStorage` / `StorageEnum` は既存 base を利用）

## ディレクトリ構造

```
packages/storage/
├── package.json                       (編集: dependencies に block-engine 追加)
├── tsconfig.json                      (必要なら references 追加)
└── lib/impl/
    ├── focusgate-settings-storage.ts  (新規)
    └── index.ts                       (編集: re-export 追加)
```

## 実装の順序

1. `package.json` に `@extension/block-engine` 依存を追加し `pnpm install`
2. `focusgate-settings-storage.ts` を新規作成（型 → createStorage → 補助関数）
3. `impl/index.ts` に re-export 追加
4. `pnpm -F @extension/storage ready` を実行。型解決エラーが出れば `tsconfig.json` の `references` を調整
5. `type-check` / `lint` を通す

## セキュリティ考慮事項

- 追加・更新ドメインは必ず `DomainNormalizer` を通し、不正値は throw で弾く（誤マッチ・不正データ混入防止）
- `chrome.storage.local` への書き込みは補助関数経由に限定し、UI/SW からの直接操作を排除（依存ルール遵守）

## パフォーマンス考慮事項

- すべて O(サイト数) の配列操作で、サイト数は数十件程度を想定。popup の 200ms 初期化要件に影響しない

## 将来の拡張性

- 設定スキーマ変更時は `version` フィールドでマイグレーション分岐が可能（本ステップでは version=1 固定）
- 補助関数を storage に集約することで、将来サイトごとのレベル個別化等の拡張も窓口を一本化したまま対応できる
