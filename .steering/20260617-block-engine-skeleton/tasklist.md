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

## フェーズ1: パッケージ骨格の作成

- [x] `packages/block-engine/package.json` を作成（storage を踏襲）
  - [x] `name: "@extension/block-engine"`
  - [x] scripts に `ready: "tsc -b"` と `test: "vitest run"` を追加
  - [x] devDeps に `@extension/tsconfig: workspace:*` と `vitest`（^3.2.4）を追加
- [x] `packages/block-engine/tsconfig.json` を作成（storage を踏襲）
- [x] `packages/block-engine/index.mts` を作成（re-export）

## フェーズ2: 型・定数の定義

- [x] `packages/block-engine/lib/types.ts` を作成
  - [x] `WarningLevel`
  - [x] `BlockSite`
  - [x] `FocusGateSettings`
  - [x] `BlockDecision`
- [x] `packages/block-engine/lib/constants.ts` を作成
  - [x] `STORAGE_KEY = 'focusgate-settings'`
  - [x] `DEFAULT_SETTINGS`（version=1, globalEnabled=true, warningLevel='B', 初期4サイト）

## フェーズ3: ロジック雛形と公開API

- [x] `packages/block-engine/lib/domain-normalizer.ts` 雛形を作成
- [x] `packages/block-engine/lib/block-engine.ts` 雛形を作成
- [x] `packages/block-engine/lib/index.ts` で re-export

## フェーズ4: turbo 設定

- [x] `turbo.json` の `tasks` に `test`（`dependsOn: ["^ready"]`, `cache: false`）を追加

## フェーズ5: 品質チェックと検証

- [x] `pnpm install` がエラーなく完了する
- [x] `pnpm -F @extension/block-engine ready` が dist 生成・エラー無し（dist/index.mjs + dist/lib/*.js 出力）
- [x] `pnpm type-check` が通過する（`@extension/block-engine` 単体は通過。リポジトリ全体では `packages/ui` の `@/lib/...` パスエイリアス未解決による既存エラーが popup/options/content-ui で発生するが、これは turbo.json 変更を stash しても同一に再現する**ボイラープレート由来の既存問題**であり、本ステップとは無関係）

## フェーズ6: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-17

### 計画と実績の差分

**計画と異なった点**:
- `vitest` のバージョンはリポジトリで直接の devDependency 宣言が無く、pnpm-lock.yaml に 2.1.9 / 3.2.4 が推移的に存在していたため、新しい `^3.2.4` を採用した（後続ステップ1で実テスト導入時に確定）。
- `DEFAULT_SETTINGS` の各サイト `id` は `crypto.randomUUID()` をモジュール評価時に1回だけ確定する形にした（初期4ドメインを map で生成）。
- 公開API `lib/index.ts` は型を `export type *`、値（constants/normalizer/engine）を `export *` に分けた（NodeNext の isolatedModules 互換のため）。

**新たに必要になったタスク**:
- 特になし（計画どおり）。

**技術的理由でスキップしたタスク**:
- なし。

### 学んだこと

**技術的な学び**:
- 本ボイラープレートの純TSパッケージは `types` フィールドがソースの `index.mts` を直接指す方式で、dist には `.d.ts` を出力しない（storage と同型）。block-engine もこれに揃えた。
- リポジトリ全体の `pnpm type-check` には、`packages/ui` の `@/lib/...` パスエイリアス未解決という**既存の失敗**がある（turbo.json 変更を stash しても同一に再現）。ステップ0の成否判定は block-engine 単体の ready / type-check 成功で確認した。

**プロセス上の改善点**:
- tasklist.md をフェーズ単位でリアルタイム更新し、検証結果（既存エラーの切り分け含む）を正確に残せた。

### 次回への改善提案
- ステップ1（TDD）では `packages/block-engine/vitest.config.ts` と spec を追加し、`pnpm -F @extension/block-engine test` のグリーンを成否基準にする。
- リポジトリ全体の type-check を成否基準にしたい場合は、別途 `packages/ui` のパスエイリアス問題の調査が必要（ステップ0スコープ外）。
