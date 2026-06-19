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

## フェーズ1: navigation.ts への破棄ロジック追加

- [x] `hostMatchesDomain(host, domain)` ヘルパーを追加（`host === domain || host.endsWith('.'+domain)`）
- [x] `revokeIfDomainChanged(tabId, url)` を追加
  - [x] `allowMap.get(tabId)` が無ければ早期 return
  - [x] `DomainNormalizer.normalize(url)` で遷移先ホストを正規化
  - [x] どの許可ドメインにもマッチしなければ `allowMap.delete(tabId)`（`normalize` は全域関数のため try/catch 不要）
- [x] `handleBeforeNavigate` 冒頭（`frameId!==0` ガード直後・既存判定より前）に `revokeIfDomainChanged` 呼び出しを挿入
- [x] `DomainNormalizer` の import を追加（`@extension/block-engine` から `BlockEngine` と並べて import）

## フェーズ2: 品質チェックと修正

- [x] `pnpm -F chrome-extension type-check` が通過（エラー0）
- [x] `pnpm -F chrome-extension lint` がエラー0
- [x] `pnpm build` が成功し `dist/background.js` が生成される（turbo 21/21 成功、`background.js` 32KB に revoke ロジック `endsWith` がバンドル）

## フェーズ3: 手動実機確認

- [x] レベルB で youtube 許可 → 同一タブで google へ → youtube 再訪で**再確認される** ※ユーザー実機確認済み
- [x] `youtube.com` ↔ `m.youtube.com` のサブドメイン間遷移では許可維持（再確認されない）
- [x] 同一ドメイン内ページ遷移では許可維持（非回帰）
- [x] タブを閉じると許可破棄（既存）が維持される
- [x] レベルC・全体OFF・個別OFF・対象外素通しが不変

## フェーズ4: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-18

### 計画と実績の差分

**計画と異なった点**:
- 当初 design に「`normalize` 例外時の方針」を残していたが、`DomainNormalizer.normalize` が全域関数（`new URL()` は内部 try/catch 済み・他は文字列メソッド）であることを確認し、例外処理タスクを削除して実装を簡素化した。

**新たに必要になったタスク**:
- なし（`navigation.ts` の編集のみで完結）。

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- 例外ハンドリング（`normalize` が例外を投げないため不要と判明）。

### 学んだこと

**技術的な学び**:
- メインフレーム遷移は必ず `onBeforeNavigate` を最早で通るため、ここを唯一のチェックポイントにすれば「ドメイン変更時の許可破棄」を漏れなく実現できる。許可が無いタブは即 return で安価。
- サブドメイン維持の判定は `decide` の matchSite と同じ `host === domain || host.endsWith('.'+domain)` ルールに揃えることで挙動の一貫性を担保。
- 機能設計書の「タブ閉じ or ドメイン変更で破棄」のうち、ステップ6 では前者のみ実装されていた。仕様と実装の差分を仕様確認で洗い出し、別タスク化して埋めた。

**プロセス上の改善点**:
- ユーザーとの「認識合わせ」で削除条件（含まれない場合のみ破棄）を明文化してから実装に入り、手戻りを防いだ。

### 次回への改善提案
- `hostMatchesDomain` は block-engine の matchSite と同ルール。重複が増えるなら block-engine に公開ヘルパーとして切り出し共通化するとよい。
