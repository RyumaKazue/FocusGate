# 設計書

## アーキテクチャ概要

`@extension/block-engine` は依存ルールの最下層に位置する純TSパッケージ。`chrome.*` API や他 `@extension/*` パッケージに依存せず、型・定数・純粋ロジックのみを提供する。これにより上位レイヤーが本パッケージの型を参照しても循環依存が発生しない。

```
@extension/block-engine（最下層・chrome.* 非依存・他 @extension/* 非依存）
   ↑ 型のみ依存
@extension/storage
   ↑
UI（popup/options/content-ui） / background(SW)
```

ビルドは Vite/tsup ではなく `tsc -b`（`packages/storage` と同方式）。

## コンポーネント設計

### 1. types.ts（データモデル）

**責務**:
- FocusGate 全体で共有する型を一元定義

**実装の要点**:
- `WarningLevel = 'B' | 'C'`
- `BlockSite { id, domain, label: string | null, enabled, isDefault }`
- `FocusGateSettings { version, globalEnabled, warningLevel, sites: BlockSite[] }`
- `BlockDecision`（判別共用体: `{blocked:false}` | `{blocked:true; level; site}`）

### 2. constants.ts（定数）

**責務**:
- ストレージキーと初期設定値を定義

**実装の要点**:
- `STORAGE_KEY = 'focusgate-settings'`
- `DEFAULT_SETTINGS`: version=1, globalEnabled=true, warningLevel='B'
- 初期4サイト（youtube.com / tiktok.com / instagram.com / facebook.com）、各 enabled:true / isDefault:true / id=`crypto.randomUUID()`
- `DEFAULT_SETTINGS` を関数で生成するか定数で持つかは、`crypto.randomUUID()` を呼ぶため値の確定方法に注意（毎回同一IDが必要なら定数評価時に1回確定）

### 3. domain-normalizer.ts（雛形）

**責務**:
- ドメイン正規化・バリデーション（実装はステップ1）

**実装の要点**:
- ステップ0では関数シグネチャと未実装スタブ（または最小骨格）のみ。型が通ることを優先

### 4. block-engine.ts（雛形）

**責務**:
- URL と設定から `BlockDecision` を返す判定（実装はステップ1）

**実装の要点**:
- ステップ0ではシグネチャと最小骨格のみ

### 5. index.mts / lib/index.ts（公開API）

**責務**:
- types / constants / domain-normalizer / block-engine を re-export

**実装の要点**:
- `index.mts` は `export * from './lib/index.js'`（storage 踏襲）
- NodeNext のため re-export は `.js` 拡張子付き

## データフロー

### パッケージビルド
```
1. pnpm install で workspace にパッケージ登録
2. pnpm -F @extension/block-engine ready → tsc -b
3. dist/ に .mjs / .d.ts 出力
```

## エラーハンドリング戦略

### カスタムエラークラス
- ステップ0では不要（ロジック未実装）

### エラーハンドリングパターン
- 雛形段階のため該当なし

## テスト戦略

### ユニットテスト
- ステップ0ではテスト未実装（vitest 導入のみ）。実テストはステップ1

### 統合テスト
- 該当なし

## 依存ライブラリ

devDependencies に追加:

```json
{
  "devDependencies": {
    "@extension/tsconfig": "workspace:*",
    "vitest": "<repo既存バージョンに合わせる>"
  }
}
```

## ディレクトリ構造

```
packages/block-engine/
├── package.json        (新規: storage を踏襲)
├── tsconfig.json       (新規: storage を踏襲)
├── index.mts           (新規: re-export)
└── lib/
    ├── index.ts        (新規: re-export)
    ├── types.ts        (新規: データモデル)
    ├── constants.ts    (新規: STORAGE_KEY / DEFAULT_SETTINGS)
    ├── domain-normalizer.ts  (新規: 雛形)
    └── block-engine.ts (新規: 雛形)

turbo.json              (編集: tasks に test 追加)
```

## 実装の順序

1. `packages/block-engine/package.json` 作成（storage 踏襲 + vitest/test script）
2. `tsconfig.json` / `index.mts` 作成
3. `lib/types.ts` 作成（データモデル）
4. `lib/constants.ts` 作成（STORAGE_KEY / DEFAULT_SETTINGS）
5. `lib/domain-normalizer.ts` / `lib/block-engine.ts` 雛形作成
6. `lib/index.ts` で re-export
7. `turbo.json` に test タスク追加
8. `pnpm install` → `ready` → `type-check` で検証

## セキュリティ考慮事項

- 本パッケージは `chrome.*` に非依存で副作用なし（`sideEffects: false`）
- `crypto.randomUUID()` は SW / ブラウザ / Node22 すべてで利用可、外部依存ゼロ

## パフォーマンス考慮事項

- 純TS・軽量。ビルド時間以外の懸念なし

## 将来の拡張性

- 型・定数を集約することで、storage/UI/background から型のみ参照可能になり循環依存を回避
- ステップ1でロジック本体を TDD で肉付けする土台となる
