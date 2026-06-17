# 要求内容

## 概要

ステップ0で作成した `@extension/block-engine` の雛形（`DomainNormalizer` / `BlockEngine`）に、Vitest による TDD で実ロジックを実装する。FocusGate の判定の頭脳（縦スライスの中核）を完成させる。

## 背景

`docs/mvp-implementation-plan.md` の確定方針「block-engine のみ TDD」に従い、純粋ロジックである `DomainNormalizer`（ドメイン正規化・バリデーション）と `BlockEngine`（ブロック判定）をテスト駆動で実装する。これらは `chrome.*` 非依存の純関数のため自動テストが容易で、後続のストレージ／SW／UI（ステップ2以降）が依存する判定基盤となる。

機能設計書（`docs/functional-design.md`）の「ブロック判定アルゴリズム」「ドメイン正規化アルゴリズム」と判定表・正規化表が確定済みであり、本ステップはこれを spec に落として実装する。

## 実装対象の機能

### 1. Vitest 設定の追加
- `packages/block-engine/vitest.config.ts`（`environment: 'node'`）
- `ready`（`tsc -b`）がテストファイルを巻き込まずクリーンな dist を生成できるようにする

### 2. DomainNormalizer の実装（TDD）
- `normalize(input)`: trim → スキーム有なら `new URL().hostname` / 無ならパス除去 → 小文字 → 先頭 `www.` 除去 → 末尾ドット・ポート除去
- `isValid(domain)`: 2つ以上のラベル・各ラベル英数字ハイフンのみ・TLD 2文字以上

### 3. BlockEngine の実装（TDD）
- `decide(url, settings)`:
  1. `globalEnabled === false` → `{ blocked: false }`
  2. ホスト名抽出（非 http(s)/不正URL は `{ blocked: false }`）・正規化（小文字・先頭 `www.` 除去）
  3. `site.enabled` かつ ホストが `site.domain` と完全一致 or `"." + site.domain` で終端する最初のサイト → `{ blocked: true, level: settings.warningLevel, site }`

## 受け入れ条件

### DomainNormalizer.normalize
- [ ] ` https://www.YouTube.com/feed ` → `youtube.com`
- [ ] `http://m.youtube.com` → `m.youtube.com`
- [ ] `youtube.com/watch?v=abc` → `youtube.com`
- [ ] `WWW.Example.COM` → `example.com`
- [ ] `example.com:8080` → `example.com`
- [ ] `example.com.`（末尾ドット） → `example.com`
- [ ] `https://sub.example.co.jp/path` → `sub.example.co.jp`

### DomainNormalizer.isValid
- [ ] 有効: `youtube.com`, `sub.example.co.jp`
- [ ] 無効: `''`, `youtube`（TLD無し）, `http://`（ホスト無し）, 空白を含む文字列, TLDが1文字

### BlockEngine.decide
- [ ] `globalEnabled=false` のとき youtube.com でも `{ blocked: false }`
- [ ] 対象サイトが `enabled=false`（サービスOFF）なら `{ blocked: false }`
- [ ] `https://m.youtube.com`（youtube.com 有効）→ `blocked: true`
- [ ] `https://music.youtube.com` → `blocked: true`
- [ ] `https://notyoutube.com` → `{ blocked: false }`
- [ ] `chrome://extensions`（非 http）→ `{ blocked: false }`
- [ ] `https://youtube.com` 完全一致 → `blocked: true`
- [ ] `https://www.youtube.com`（www 除去後一致）→ `blocked: true`
- [ ] `warningLevel` が 'B'/'C' のとき、結果の `level` がそれぞれ反映される
- [ ] 複数サイトのうち最初にマッチした有効サイトが `site` として返る

### 全体
- [ ] `pnpm -F @extension/block-engine test` が全グリーン
- [ ] `pnpm -F @extension/block-engine ready` / `type-check` / `lint` が引き続き成功

## 成功指標

- 機能設計書の判定表・正規化表の全ケースが spec として表現され、全て通過
- 縦スライスの「頭脳」が完成し、ステップ2（storage 連携）へ即着手可能

## スコープ外

以下はこのフェーズ（ステップ1）では実装しません:

- storage 連携（`focusgate-settings-storage`）= ステップ2
- manifest / blocked.html / SW / UI = ステップ3以降
- SPA 内遷移対応・E2E

## 参照ドキュメント

- `docs/mvp-implementation-plan.md` - MVP 実装計画（ステップ1）
- `docs/functional-design.md` - 判定アルゴリズム（270-336行）・テスト観点（555行）
- `docs/development-guidelines.md` - コーディング規約
