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

## フェーズ1: blocked.html の作成

- [x] `chrome-extension/public/blocked.html` を新規作成
  - [x] `<!doctype html>` / `lang` / `charset` / `viewport` の基本構造
  - [x] 集中を促す穏やかな固定メッセージ
  - [x] 対象サイト名プレースホルダ（`#site-name`）
  - [x] 「戻る」ボタン（`#back-button`、インライン onclick 不使用）
  - [x] `<style>` で最小限・刺激の少ないトーンの装飾
  - [x] 末尾に `<script src="blocked.js"></script>`

## フェーズ2: blocked.js の作成

- [x] `chrome-extension/public/blocked.js` を新規作成
  - [x] `URLSearchParams` で `site` を取得し `#site-name` に `textContent` で反映
  - [x] `site` 欠落時のフォールバック表示
  - [x] `#back-button` に click → `history.back()` を登録

## フェーズ3: manifest 編集

- [x] `permissions` に `'webNavigation'` を追加
- [x] `web_accessible_resources[0].resources` に `'blocked.html'` を追加

## フェーズ4: ビルドと手動確認

- [x] `pnpm build` で `dist/blocked.html`（2176B）と `dist/blocked.js`（715B）が生成されることを確認。`dist/manifest.json` に `webNavigation` 権限と `blocked.html` の WAR 登録、`blocked.html` 内の `src="blocked.js"` 参照も確認済み
- [x] Chrome DevTools MCP で `dist/blocked.html?site=youtube.com` を表示し、対象サイト名「youtube.com」が表示されることを確認（`file://` 経由）
- [x] `?site=` 無しで「このサイト」とフォールバック表示されることを確認
- [x] コンソールメッセージ 0 件（エラー無し）。※ `file://` 検証のため拡張 CSP（`script-src 'self'`）の厳密検証はステップ4で `chrome-extension://` 読み込み時に最終確認する
- [x] 「戻る」ボタンが存在し描画される（`history.back()` ハンドラ登録済み。実遷移はナビ履歴のある実機で最終確認）
- [x] type-check が通過（chrome-extension パッケージ）
- [x] lint 通過のため、`blocked.js` 冒頭に inline の `/* global URLSearchParams, location, document, history */` を宣言（ボイラープレートの eslint 設定は browser globals を `*.{ts,tsx}` のみに付与し、素の `.js` では `no-undef` が出るため）。当初ルート `eslint.config.ts` に設定ブロックを追加したが、コミット時に lint-staged が `eslint.config.ts` を lint 対象に含め、同ファイルの既存 deprecation（`typescript-eslint` の `config` API 廃止予定、9・12行目）が表面化したため、共有設定を触らず `blocked.js` 単体で完結する inline 宣言方式に変更した
- [x] `pnpm -F chrome-extension lint` がエラー0（`eslint.config.ts` 変更なし）

## フェーズ5: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-18

### 計画と実績の差分

**計画と異なった点**:
- 特になし。計画通り `blocked.html` / `blocked.js` の2ファイル分離（CSP 遵守）と manifest 2点の編集で完了した。

**新たに必要になったタスク**:
- **`blocked.js` のブラウザグローバル対応**（計画外）。ボイラープレートの eslint 設定は browser グローバル（`URLSearchParams`/`location`/`document`/`history`）を `**/*.{ts,tsx}` のみに付与していたため、新規の素の `.js`（`blocked.js`）で `no-undef` が5件発生した。
  - 当初: ルート `eslint.config.ts` に `**/public/**/*.js` 向けのブラウザグローバル設定ブロックを追加した（モノレポ全体 `pnpm lint` 20/20 成功も確認）。
  - 最終: しかし `git commit` の pre-commit（lint-staged）が `eslint.config.ts` を lint 対象に含めた結果、同ファイルに**元から潜在していた** deprecation エラー（`import-x/no-deprecated`: `typescript-eslint` の `config` API が `defineConfig()` 推奨で廃止予定、9・12行目）が表面化しコミットが失敗した。これは私の追加行とは無関係だが、`eslint.config.ts` をステージしたことで初めて lint された。
  - そのため共有設定の変更を撤回し、`blocked.js` 冒頭に inline `/* global ... */` を宣言する方式へ変更。これにより①共有設定を触らない②既存 deprecation を表面化させない③`blocked.js` 単体で lint 通過、を同時に満たした。

**技術的理由でスキップしたタスク**:
- なし。全タスク完了。

### 学んだこと

**技術的な学び**:
- MV3 拡張ページのデフォルト CSP は `script-src 'self'` でインラインスクリプトを禁止する。クエリパース等の動的処理は外部 `.js` に分離するのが定石。`style-src` はインラインを許容するため `<style>` 要素は使用可で、HTML 単体で完結できた。
- このリポジトリの flat eslint 設定では、browser グローバルが TS/TSX にのみ紐付いている。`public/` 配下に素の `.js` を置く場合は、共有 `eslint.config.ts` を触るより **ファイル冒頭の inline `/* global ... */` 宣言**で補う方が安全（変更が局所化され、共有設定の lint で別の潜在問題を誘発しない）。
- **pre-commit の lint-staged は「ステージしたファイル」を lint する**。普段 lint されない設定ファイル（`eslint.config.ts` 等）を編集・ステージすると、そこに潜在していた lint エラー（今回は `typescript-eslint` の `config` API 廃止予定）が初めて表面化してコミットを止める。共有設定ファイルの変更は影響範囲が広く、コミット可否にも波及する点に注意。
- Vite の `publicDir`（`chrome-extension/vite.config.mts:34`）により `public/` 配下は dist 直下へそのままコピーされる（`content.css` と同じ前例）。`blocked.html`/`blocked.js` も追加設定なしで dist 出力された。
- Chrome DevTools MCP で `file://` 経由の静的ページ表示・クエリ反映・コンソール監視まで自動検証できた。一方で拡張 CSP の厳密検証は `chrome-extension://` 読み込みが必要で、`file://` では代替できない点に注意。

**プロセス上の改善点**:
- 静的ページ単体を MCP で表示確認することで、SW 実装（ステップ4）を待たずにレベルC の出口を視覚的に検証でき、縦スライス接続前に出口側の不具合を潰せた。
- 計画外の eslint 対応をその場で tasklist にタスク追加し、理由と回帰確認まで記録できた（モード2の「乖離時は注釈追加」の運用が機能）。

### 次回への改善提案
- ステップ4（SW: `onBeforeNavigate` → レベルC リダイレクト）で実際に拡張を Chrome に読み込む。そのタイミングで `chrome-extension://<id>/blocked.html` の拡張 CSP 厳密検証と「戻る」ボタンの実遷移を最終確認する（本ステップで保留した2点）。
- リダイレクト時の `?site=` には `site.label ?? site.domain` を `encodeURIComponent` で渡す（計画書 154 行）。`blocked.js` は既に `URLSearchParams` でデコードするため受け側は対応済み。
