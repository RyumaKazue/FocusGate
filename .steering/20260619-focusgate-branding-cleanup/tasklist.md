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

## フェーズ1: 製品メタデータの FocusGate 化

- [x] `package.json` の `name` / `description` / `repository.url` を FocusGate に更新
- [x] `packages/shared/const.ts` の `PROJECT_URL_OBJECT.url` を FocusGate リポジトリに更新
- [x] `packages/i18n/locales/en/messages.json` の `extensionName` / `extensionDescription` を FocusGate に更新
- [x] `packages/i18n/locales/ko/messages.json` の `extensionName` / `extensionDescription` を FocusGate に更新

## フェーズ2: README の刷新

- [x] `README.md` を FocusGate のプロダクト説明・主要機能・セットアップ手順中心の日本語 README に書き換え（boilerplate ベースのクレジットは技術スタック節に一文残す）

## フェーズ3: デモ content script / 全サイト注入の削除

- [x] `pages/content-ui/src/matches/all`・`pages/content-ui/src/matches/example` を削除（focusgate のみ残存）
- [x] `pages/content`・`pages/content-runtime` を**パッケージごと削除**（実装方針変更: matches を空にする方式は、空ディレクトリが git 管理されず fresh clone 時に `getContentScriptEntries` の `readdirSync` が失敗するため。両パッケージは manifest からも未参照（`content.css` は `chrome-extension/public` の公開アセットで独立）であり、削除が安全）
- [x] `chrome-extension/manifest.ts` の `content_scripts` から content/all・content/example・content-ui/all・content-ui/example を削除し、focusgate と content.css のみ残す

## フェーズ4: デモページの削除

- [x] `pages/new-tab` / `pages/side-panel` / `pages/devtools-panel` / `pages/devtools` をディレクトリごと削除（pages は content-ui / options / popup の3つに）
- [x] `chrome-extension/manifest.ts` から `chrome_url_overrides`（newtab）/ `side_panel` / `devtools_page` を除去（併せて stale な sidePanel コメントも削除）
- [x] `manifest.ts` の `permissions` から `sidePanel` を除去

## フェーズ5: 未使用デモ i18n キーの整理

- [x] `injectButton` / `greeting` / `hello` / `toggleTheme` を en / ja / ko から削除
- [x] en / ja / ko の `messages.json` キー集合が一致することを node スクリプトで確認（各28キー・一致）

## フェーズ6: e2e テストの整理

- [x] デモ依存スペックの棚卸し（example.com content script / 注入UI / テーマ切替 / 削除ページを参照する spec・helper を特定）
- [x] デモ依存スペックを削除（page-content / page-content-ui / page-content-runtime / page-new-tab / page-side-panel / page-devtools-panel）
- [x] テーマ切替依存を除去（`page-popup` / `page-options` から `canSwitchTheme` を除去、未参照の `tests/e2e/helpers/theme.ts` を削除）
- [x] `tests/e2e/specs/smoke.test.ts` を確認し、汎用ページ読込確認のみでデモ非依存のため**維持**

## フェーズ7: 品質チェックと修正

- [x] en / ja / ko キー集合一致を確認（各28キー・一致）
- [x] 型チェック（`pnpm type-check`）— 本変更起因の新規エラーなし。`packages/ui` の `@/` 解決による既存エラーのみ（前タスクで git stash により既存事象と確認済み）で、`pnpm build` のパイプライン型生成では解消される
- [x] リント（`pnpm lint`、14/14 成功）
- [x] ビルド（`pnpm build`、15/15 成功。dist/manifest から newtab override / side_panel / devtools_page / sidePanel が消え、content_scripts は focusgate + content.css のみ。dist/content-ui は focusgate.iife.js のみ、dist/content は生成されない）

## フェーズ8: 振り返り

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-19

### 計画と実績の差分

**計画と異なった点**:
- 当初は `content` / `content-runtime` を「matches を空にして no-op パッケージとして残置」する計画だったが、**パッケージごと削除**に変更した。理由: 空の `matches` ディレクトリは git 管理されず（git は空ディレクトリを追跡しない）、fresh clone 時に `getContentScriptEntries` の `readdirSync(matchesDir)` が ENOENT で失敗するため。両パッケージは manifest からも未参照（`content.css` は `chrome-extension/public` の独立した公開アセット）であり、削除が安全かつ堅牢と判断した。
- ユーザー指示により、フェーズ4を「デモページの FocusGate 化」から「**デモページの削除**」に変更（new-tab / side-panel / devtools-panel / devtools をディレクトリごと削除＋manifest 登録・`sidePanel` 権限を除去）。これに伴い `focusTagline` の新規キー追加は不要となった。
- e2e は当初 page-content / page-content-ui の削除のみ想定していたが、削除ページに対応する page-new-tab / page-side-panel / page-devtools-panel / page-content-runtime も削除が必要だった。さらに残す page-popup / page-options は `canSwitchTheme`（テーマ切替）に依存していたため、当該呼び出しと未参照化した `helpers/theme.ts` を除去した。

**新たに必要になったタスク**:
- `content.css` の生成元調査（`chrome-extension/public/content.css` の独立アセットと確認 → content パッケージ削除の安全性担保）。
- 削除ページに依存する e2e スペックの網羅的な棚卸し。

**技術的理由でスキップしたタスク**:
- なし（全タスク完了）。

### 学んだこと

**技術的な学び**:
- ボイラープレートのデモは「ページ」「content script の matches」「i18n キー」「e2e スペック」「共通UI部品（ToggleButton/exampleThemeStorage）」「module-manager の定数」と多層に絡む。表面（ページ・注入）を消すだけでなく、依存する i18n キー・テストまで芋づる式に整理しないと参照切れ・テスト破綻が残る。
- content script パッケージのビルドは `matches` ディレクトリを `readdirSync` で走査するため、「空ディレクトリで残す」設計は git の空ディレクトリ非追跡と相性が悪い。残すなら有効なエントリが要り、不要なら**パッケージごと消す**のが正解。
- `__MSG_*__`（manifest の name/description）と messages.json の連動により、ロケールの `extensionName`/`extensionDescription` を直すだけで拡張機能管理画面の表示も FocusGate になる。
- `pnpm type-check` 単独は `packages/ui` の `@/` エイリアス解決（事前ビルド前提）で既存エラーを出すが、`pnpm build` のパイプラインでは型生成され成功する。権威ある検証は build 側。

**プロセス上の改善点**:
- 承認ゲートで「判断ポイント」を明示列挙したことで、ユーザーがフェーズ4の方針（FocusGate 化 → 削除）をピンポイントで修正でき、手戻りなく合意できた。
- 削除前に「参照元（manifest / import / css 生成元 / e2e）」を grep で洗ってから消したことで、ビルド一発成功につながった。

### 次回への改善提案
- 残置した `exampleThemeStorage` / `ToggleButton` / `PROJECT_URL_OBJECT` / `packages/module-manager`（削除ページをディレクトリ名定数で参照）は、ボイラープレート残骸の「第2陣」として別 steering で整理できる。
- `dist/content-ui/logo.svg`（content-ui/public の未使用デモアセット）など、public 配下の未使用アセットも併せて棚卸しすると良い。
- ロケール間のキー集合一致チェックを CI 化すると、今後のキー追加・削除での不整合を継続的に防げる。
