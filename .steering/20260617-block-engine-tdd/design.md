# 設計書

## アーキテクチャ概要

`@extension/block-engine` の純粋ロジックを TDD で実装する。本パッケージは依存ルールの最下層（`chrome.*` 非依存・他 `@extension/*` 非依存）であり、`DomainNormalizer` と `BlockEngine` はいずれも副作用のない純関数として実装する。テストは Vitest（`environment: 'node'`、`chrome` モック不要）。

```
spec（仕様 = テスト）── 駆動 ──▶ DomainNormalizer / BlockEngine（純関数）
        ▲                                  │
        └────── 機能設計書の判定表/正規化表 ◀┘
```

## コンポーネント設計

### 1. vitest.config.ts

**責務**:
- block-engine 内でテスト実行設定を完結させる

**実装の要点**:
- `defineConfig({ test: { environment: 'node' } })`
- `import-x/order` 等の lint ルールに準拠（型・external import の並び）

### 2. DomainNormalizer（`lib/domain-normalizer.ts`）

**責務**:
- `normalize(input: string): string` — 入力を一貫形式へ
- `isValid(domain: string): boolean` — 正規化後ドメインの妥当性判定

**実装の要点**:
- normalize 手順: ①trim ②スキーム有(`/^https?:\/\//`)なら `new URL(input).hostname`、無ければ最初の `/` 以降を除去 ③`toLowerCase()` ④先頭 `www.` 除去 ⑤末尾のドット・ポート(`:8080`)除去
- `new URL()` 経由ではポートは hostname に含まれないが、スキーム無し入力のポート除去のため明示的に `:\d+$` を除去する
- isValid: `.` 分割で**2ラベル以上**、各ラベル `^[a-z0-9-]+$`、最終ラベル(TLD)が2文字以上。空文字・空白含みは false
- 既存のオブジェクトリテラル形式（`export const DomainNormalizer = { ... }`）を踏襲（ステップ0と一貫、`func-style` 規約準拠）

### 3. BlockEngine（`lib/block-engine.ts`）

**責務**:
- `decide(url, settings): BlockDecision` — ブロック要否と警告レベルを決定

**実装の要点**:
- 機能設計書 290-320 行の実装例に準拠
- ステップ0の `void url; void settings;` スタブを実ロジックへ置換
- ホスト抽出は `new URL(url).hostname`（try/catch、失敗時 null）→ `toLowerCase()` → 先頭 `www.` 除去
- マッチ判定（完全一致 or `"." + domain` 終端）は内部ヘルパー（非エクスポートの `matchSite` 相当）に切り出し、`decide` を簡潔に保つ
- 非 http(s) スキーム（`chrome://` 等）は `new URL` は成功するが http(s) でないため `{ blocked: false }`。判定は「hostname が空 or プロトコルが http/https 以外」で早期リターン

## データフロー

### decide 判定
```
1. globalEnabled=false → {blocked:false}
2. URL パース失敗 / 非 http(s) → {blocked:false}
3. host 正規化（小文字・www除去）
4. sites を走査: enabled かつ (host===domain または host.endsWith("."+domain)) の最初の1件
5. マッチ → {blocked:true, level: settings.warningLevel, site} / 無し → {blocked:false}
```

## エラーハンドリング戦略

### カスタムエラークラス
- 不要。`new URL` の失敗は try/catch で握り `{ blocked: false }` / `null` にフォールバック

### エラーハンドリングパターン
- 不正入力は例外を投げず安全側（ブロックしない／無効判定）に倒す

## テスト戦略

### ユニットテスト
- `lib/domain-normalizer.spec.ts`: normalize 正規化表 / isValid 有効・無効ケース
- `lib/block-engine.spec.ts`: decide 判定表（全体OFF / サービスOFF / m.youtube ○ / music.youtube ○ / notyoutube × / chrome:// × / 完全一致 / www 除去 / B・C レベル反映 / 最初のマッチ優先）
- テストデータは `DEFAULT_SETTINGS` をベースに `structuredClone` 等で組み立て、`globalEnabled` / `warningLevel` / `sites[].enabled` を上書き

### 統合テスト
- なし（ステップ4で実機の縦スライス確認）

## 依存ライブラリ

- 追加なし（`vitest` はステップ0で devDep 追加済み `^3.2.4`）

## ディレクトリ構造

```
packages/block-engine/
├── vitest.config.ts          (新規)
└── lib/
    ├── domain-normalizer.ts   (編集: 雛形→実装)
    ├── domain-normalizer.spec.ts (新規)
    ├── block-engine.ts        (編集: スタブ→実装)
    └── block-engine.spec.ts   (新規)

packages/block-engine/tsconfig.json (編集の可能性: spec を build から除外)
```

## 実装の順序

1. `vitest.config.ts` を追加し `pnpm -F @extension/block-engine test`（テスト無しで起動成功）を確認
2. `domain-normalizer.spec.ts` を先に書く（Red）→ `normalize`/`isValid` 実装（Green）
3. `block-engine.spec.ts` を書く（Red）→ `decide` 実装（Green）
4. `ready` で dist 汚染（spec の混入）が無いか確認。混入する場合は tsconfig に `exclude: ["**/*.spec.ts"]` を追加
5. `lint` / `type-check` / `test` を通す

## セキュリティ考慮事項

- 入力 URL/ドメインは正規化・バリデーションを通し、例外時は安全側にフォールバック（DoS・誤マッチ防止）

## パフォーマンス考慮事項

- いずれも O(サイト数) の単純走査。判定は軽量で 50ms 要件に十分

## 将来の拡張性

- `matchSite` を内部ヘルパー化することで、将来のマッチ規則変更（サブパス指定等）を局所化できる
