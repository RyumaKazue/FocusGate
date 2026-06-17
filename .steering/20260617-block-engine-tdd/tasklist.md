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

## フェーズ1: Vitest 設定

- [x] `packages/block-engine/vitest.config.ts` を作成（`environment: 'node'`）
- [x] `pnpm -F @extension/block-engine test` がテスト未存在でも起動成功することを確認

## フェーズ2: DomainNormalizer の TDD

- [x] `lib/domain-normalizer.spec.ts` を作成（normalize 正規化表 / isValid 有効・無効）
  - [x] normalize: ` https://www.YouTube.com/feed ` → `youtube.com`
  - [x] normalize: `http://m.youtube.com` → `m.youtube.com`
  - [x] normalize: `youtube.com/watch?v=abc` → `youtube.com`
  - [x] normalize: `WWW.Example.COM` → `example.com`
  - [x] normalize: `example.com:8080` → `example.com`
  - [x] normalize: `example.com.` → `example.com`
  - [x] normalize: `https://sub.example.co.jp/path` → `sub.example.co.jp`
  - [x] isValid 有効: `youtube.com`, `sub.example.co.jp`
  - [x] isValid 無効: `''`, `youtube`, `http://`, 空白含み, TLD1文字
- [x] `lib/domain-normalizer.ts` の `normalize` を実装（Red→Green）
- [x] `lib/domain-normalizer.ts` の `isValid` を実装（Red→Green）

## フェーズ3: BlockEngine の TDD

- [x] `lib/block-engine.spec.ts` を作成（decide 判定表）
  - [x] 全体OFF（globalEnabled=false）→ blocked:false
  - [x] サービスOFF（site.enabled=false）→ blocked:false
  - [x] `m.youtube.com` → blocked:true
  - [x] `music.youtube.com` → blocked:true
  - [x] `notyoutube.com` → blocked:false
  - [x] `chrome://extensions`（非http）→ blocked:false
  - [x] `youtube.com` 完全一致 → blocked:true
  - [x] `www.youtube.com` → blocked:true
  - [x] warningLevel 'B'/'C' が level に反映
  - [x] 最初にマッチした有効サイトが site として返る
- [x] `lib/block-engine.ts` の `decide`（＋内部 matchSite ヘルパー）を実装（Red→Green、スタブ置換）

## フェーズ4: 品質チェックと修正

- [x] `pnpm -F @extension/block-engine test` が全グリーン（25テスト: normalizer 14 + engine 11）
- [x] `pnpm -F @extension/block-engine ready` が成功（spec/vitest.config 混入を防ぐため tsconfig を build用(`tsconfig.build.json`, spec除外・emit)と lint/type-check用(`tsconfig.json`, noEmit・全包含)に分離。`ready` は `tsc -b tsconfig.build.json` に変更）
- [x] `pnpm -F @extension/block-engine type-check` が通過
- [x] `pnpm -F @extension/block-engine lint` がエラー0

## フェーズ5: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-17

### 計画と実績の差分

**計画と異なった点**:
- tsconfig を **2分割**した。当初計画は「dist 混入時に単一 tsconfig へ `exclude: ["**/*.spec.ts"]` を追加」だったが、単一 tsconfig で spec を exclude すると、今度は spec ファイルと `vitest.config.ts` が typescript-eslint の `projectService` の対象外となり lint エラー（"was not found by the project service"）になることが判明。そのため:
  - `tsconfig.json`（noEmit・`index.mts`/`lib`/`vitest.config.ts` を全包含）= lint・type-check・IDE 用
  - `tsconfig.build.json`（emit・spec 除外）= ビルド用、`ready` を `tsc -b tsconfig.build.json` に変更
  という分離で、dist のクリーンさと全ファイルの lint 両立を実現した。
- `DomainNormalizer.normalize` のポート除去は、`new URL()` 経由では hostname にポートが含まれないが、スキーム無し入力（`example.com:8080`）に対応するため明示的に `:\d+$` 除去を実装した。

**新たに必要になったタスク**:
- `tsconfig.build.json` の新規作成と `ready` スクリプトの変更（上記の lint との両立のため）。

**技術的理由でスキップしたタスク**:
- なし。全タスク完了。

### 学んだこと

**技術的な学び**:
- typescript-eslint の `projectService: true` 環境では、lint 対象の全 TS ファイル（テスト・設定ファイル含む）がいずれかの tsconfig の `include` に入っている必要がある。「ビルド成果物のクリーンさ」と「lint 対象の網羅」はトレードオフになり得るため、ビルド用と lint/type-check 用で tsconfig を分けるのが定石。
- `vitest` は `vitest.config.ts` の有無に関わらず `environment: 'node'` 指定で純関数テストを即実行できる（`chrome` モック不要）。

**プロセス上の改善点**:
- TDD の Red→Green を spec 先行で進め、`it.each` で判定表・正規化表を表形式のまま spec に落とせた。tasklist のサブタスクとテストケースを1対1にしたことで進捗が明瞭だった。
- 今回からモード1→ユーザー承認→モード2 のゲートが機能し、計画合意の上で実装に入れた。

### 次回への改善提案
- ステップ2（`focusgate-settings-storage`）では block-engine の `DomainNormalizer`/`STORAGE_KEY`/`DEFAULT_SETTINGS`/型を再利用する。storage 側 `ready` は単一 tsconfig のままで良いが、将来 storage にも spec を足す場合は本ステップと同じ tsconfig 分離パターンを適用する。
- block-engine の tsconfig 分離パターンは、今後 tsc ビルド＋Vitest を持つ純TSパッケージの雛形として再利用できる。
