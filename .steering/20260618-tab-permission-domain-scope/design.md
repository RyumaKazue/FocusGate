# 設計書

## アーキテクチャ概要

`chrome-extension/src/background/navigation.ts` の一時許可マップ（`allowMap: Map<tabId, Set<domain>>`）に「ドメイン変更時の破棄」を追加する。メインフレームのナビゲーションは必ず `onBeforeNavigate`（最早タイミング）を通るため、ここを唯一のチェックポイントとし、遷移先ホストが当該タブの許可ドメイン範囲外なら、そのタブの許可エントリを破棄する。

```
onBeforeNavigate(frame0)
  ├─ 遷移先ホストを正規化
  ├─ allowMap[tabId] が存在 かつ どの許可ドメインにもマッチしない → allowMap.delete(tabId)   ★今回追加
  ├─ （既存）isAllowed なら素通し
  └─ （既存）level C ならリダイレクト
onCompleted(frame0)
  └─ （既存）level B かつ未許可なら SHOW_WARNING
onRemoved → allowMap.delete(tabId)   （既存）
```

## コンポーネント設計

### navigation.ts への追加

**責務**: 同一タブが許可ドメイン外へ遷移した際の一時許可破棄

**実装の要点**:
- ホストとブロックドメインのマッチ判定ヘルパーを用意（`decide` 内の `matchSite` と同じ「完全一致 or `"."+domain` 終端」ルール）:
  ```ts
  const hostMatchesDomain = (host: string, domain: string): boolean =>
    host === domain || host.endsWith(`.${domain}`);
  ```
  ※ block-engine の `matchSite` は未 export のため navigation.ts 内に小さく持つ（コアの正規化は `DomainNormalizer.normalize` を再利用）。将来重複が増えるなら block-engine に公開ヘルパーを切り出す。
- `revokeIfDomainChanged(tabId, url)` を実装:
  ```ts
  const allowed = allowMap.get(tabId);
  if (!allowed) return;                       // 許可が無ければ何もしない（安価に早期 return）
  const host = DomainNormalizer.normalize(url);
  if (![...allowed].some(d => hostMatchesDomain(host, d))) {
    allowMap.delete(tabId);                   // 許可ドメイン圏外へ出た → 破棄
  }
  ```
  ※ `normalize` は例外を投げないため try/catch 不要（「エラーハンドリング戦略」参照）。
- `handleBeforeNavigate` の冒頭（`frameId!==0` ガードの直後、既存の `decide`/`isAllowed` 判定より前）で `revokeIfDomainChanged(details.tabId, details.url)` を呼ぶ。

**`DomainNormalizer.normalize` の挙動前提**:
- スキーム付き URL は `new URL().hostname` を返す（例 `https://m.youtube.com/...` → `m.youtube.com`）。`www.` 除去・小文字化済み。
- `chrome://` 等の非 http(s) でも `new URL().hostname`（例 `extensions`）を返し、どの許可ドメインにもマッチせず破棄される（許可圏外へ出た扱い＝安全側）。

## データフロー

### 許可 → 別ドメイン → 再訪
```
1. tab5 で youtube を「進む」→ allowMap[5] = {youtube.com}
2. tab5 で google.com へ遷移 → onBeforeNavigate
   host=google.com、youtube.com にマッチしない → allowMap.delete(5)
3. tab5 で youtube へ再遷移 → onBeforeNavigate
   allowMap[5] 無し → isAllowed=false → level B 確認 / level C リダイレクトが再発動
```

### サブドメイン間遷移（許可維持）
```
1. tab5 で youtube.com を許可 → allowMap[5] = {youtube.com}
2. m.youtube.com へ遷移 → host=m.youtube.com、"youtube.com" に `.youtube.com` 終端でマッチ
   → 破棄しない → 素通し
```

## エラーハンドリング戦略
- 例外処理は不要。`DomainNormalizer.normalize` は全域関数で、唯一例外を投げ得る `new URL()` は実装内部で try/catch 済み、残りは文字列メソッドのみ。入力 `details.url` は常に `string`。`chrome://`/`about:blank` 等は例外ではなく「どの許可ドメインにもマッチしない文字列」を返し、結果として許可破棄（安全側）になる。

## テスト戦略
- ユニットテスト: なし（SW ロジックは手動確認。ただし `hostMatchesDomain` は純関数のため、必要なら block-engine 側にテスト可能な形で切り出す選択肢あり）
- 手動: 受け入れ条件のシナリオ（別ドメイン往復で再確認 / サブドメイン維持 / 同一ドメイン内維持 / タブ閉じ破棄の非回帰）

## 依存ライブラリ
新規追加なし。`DomainNormalizer`（既存 import 済み）を利用。

## ディレクトリ構造
```
chrome-extension/src/background/navigation.ts   （編集のみ）
```

## 実装の順序
1. `hostMatchesDomain` ヘルパーと `revokeIfDomainChanged` を navigation.ts に追加
2. `handleBeforeNavigate` 冒頭に revoke 呼び出しを挿入
3. 品質チェック（type-check / lint / build）
4. 手動実機確認

## セキュリティ考慮事項
- 破棄は安全側（再確認が増える方向）。緩める方向の変更ではない。

## パフォーマンス考慮事項
- `allowMap[tabId]` が無いタブ（大多数）は即 return。許可中タブのみ正規化＋マッチ判定が走る。

## 将来の拡張性
- `hostMatchesDomain` を block-engine に公開し、`decide` の `matchSite` と共通化すればマッチ規則の単一化が可能。
