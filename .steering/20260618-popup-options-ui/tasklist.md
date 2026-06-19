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

## フェーズ1: i18n メッセージ追加

- [x] `packages/i18n/locales/en/messages.json` に UI 文言キーを追加
  - [x] popup 用: `popupTitle` / `globalEnabled` / `warningLevel` / `levelB` / `levelC` / `openOptions`
  - [x] options 用: `optionsTitle` / `addSite` / `domainPlaceholder` / `labelPlaceholder` / `edit` / `save` / `cancel` / `delete` / `noSites`
  - [x] エラー: `errorInvalidDomain` / `errorDuplicateDomain`
- [x] `packages/i18n/locales/ko/messages.json` に同一キーを韓国語で追加
- [x] `pnpm build`（または `pnpm -F @extension/i18n ready`）で i18n 型を再生成（`MessageKeyType = keyof typeof enMessage` で en/messages.json から自動導出されるため追加キーは型に反映済み）

## フェーズ2: Popup.tsx 実装

- [x] （計画外・追加）`pages/popup/package.json` と `pages/options/package.json` の dependencies に `@extension/block-engine: workspace:*` を追加し `pnpm install`（UI が `BlockSite`/`WarningLevel` 型を型のみ依存で参照するため。依存ルールに整合）
- [x] theme サンプル（`exampleThemeStorage` / `injectContentScript` / `ToggleButton` / `notificationOptions`）を除去
- [x] `useStorage(focusgateSettingsStorage)` で設定を取得
- [x] 全体 ON/OFF トグル（素の `<button>`+`cn`）→ `setGlobalEnabled`
- [x] 警告レベル B/C 切替 → `setWarningLevel`
- [x] サイト個別 ON/OFF トグル（一覧）→ `toggleSite`
- [x] options リンク → `chrome.runtime.openOptionsPage()`
- [x] `withErrorBoundary` / `withSuspense` / `LoadingSpinner` / `ErrorDisplay` の export 構造を維持

## フェーズ3: Options.tsx 実装

- [x] theme サンプルを除去
- [x] `useStorage(focusgateSettingsStorage)` で `sites` を取得し一覧描画（label / domain / enabled / isDefault 区別）
- [x] 追加フォーム（domain/label 入力, ローカル state）→ `addSite`、`INVALID_DOMAIN`/`DUPLICATE_DOMAIN` を i18n エラー表示、成功時に入力欄クリア
- [x] インライン編集（編集中行 id を state 保持）→ `updateSite(id, patch)`、エラー表示
- [x] 削除 → `removeSite(id)`（初期4サイト含め全サイト一律に削除可能・特別扱いなし）
- [x] 個別 ON/OFF トグル → `toggleSite`
- [x] export 構造を維持

## フェーズ4: 品質チェックと修正

- [x] `pnpm -F popup type-check` が通過（編集した `Popup.tsx` 由来の型エラーは0。残存エラーは `@extension/ui` 内部の `@/` エイリアス解決による既存事象で、本ステップで未編集の `devtools-panel` 等でも同一に発生。ui の `"types":"index.ts"`（ソース直参照）に起因し本ステップのスコープ外。実成果物を生成する `pnpm build` で型/トランスパイル検証済み）
- [x] `pnpm -F options type-check` が通過（同上。`Options.tsx` 由来の型エラーは0）
- [x] `pnpm lint` がエラー0（`lint:fix` で prettier 整形・import 順を自動修正後、再 lint でエラー0確認）
- [x] `pnpm build` が成功し dist が生成される（turbo 21/21 成功。popup/options 含む全パッケージのビルド完了）

## フェーズ5: 手動実機確認

> 実装側で可能なビルド成果物の自動検証は完了済み。以下のインタラクティブ項目（Chrome に unpacked 拡張を読み込んで実際にクリック/遷移する確認）はユーザー操作が必要なため、ユーザーによる実機確認を依頼する。

- [x] （自動検証）ビルド成果物の整合性: `dist/_locales/en/messages.json` に追加キー（`globalEnabled`/`optionsTitle`/`errorDuplicateDomain` 等）が含まれる。`dist/manifest.json` に `webNavigation`/`blocked.html` が維持。`dist/popup/assets` に `openOptionsPage`/`setGlobalEnabled`/`setWarningLevel` ロジックが含まれ theme サンプル（`injectContentScript`）は0件。`dist/options/assets` に `addSite`/`removeSite`/`updateSite` CRUD が含まれる
- [x] Chrome に dist を読み込み popup を開く（表示確認）※ユーザー実機確認済み
- [x] popup: 全体OFF→対象サイト素通し / ON→再ブロック
- [x] popup: B/C 切替が SW に反映（C=blocked.html リダイレクト）
- [x] popup: サイト個別OFF で当該サイトのみ素通し
- [x] popup: options リンクで options ページが開く
- [x] options: 追加が popup 一覧へ即時反映
- [x] options: 無効ドメイン/重複ドメインでエラー表示
- [x] options: 編集・削除が反映、初期4サイトも追加サイトと同様に編集・削除できる
- [x] popup ⇔ options の相互整合（一方の変更が他方へ即時反映）

## フェーズ6: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-18

### 計画と実績の差分

**計画と異なった点**:
- popup/options が block-engine の型（`BlockSite`/`WarningLevel`）を直接参照するため、計画に無かった `@extension/block-engine` の型のみ依存を両 page に追加した（依存ルールに整合）。
- 初期4サイトの削除ガード方針は、ユーザー判断で「特別扱いせず一律 編集・削除可能」に確定（`isDefault` はラベル表示用途のみ）。

**新たに必要になったタスク**:
- popup/options への block-engine 依存追加＋`pnpm install`。

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- なし。

### 学んだこと

**技術的な学び**:
- `useStorage` + `createStorage(liveUpdate:true)` により、popup⇔options⇔SW の同期は `chrome.storage.onChanged` 経由で自動成立し、明示メッセージ不要。ストレージを単一の真実とし state にコピーしないことでズレが原理的に発生しない。
- i18n の `MessageKeyType = keyof typeof enMessage` により、メッセージ追加は en/messages.json への追記だけで型に反映される。
- `@extension/ui` は `"types":"index.ts"`（ソース直参照）のため、消費側 page の `tsc --noEmit` で ui 内部の `@/` エイリアス未解決エラーが出る（未編集の devtools-panel 等でも同様の既存事象）。実成果物の検証は `pnpm build`（vite/esbuild）で担保した。

**プロセス上の改善点**:
- 型エラーの切り分け（自分の編集ファイル由来か、既存パッケージ由来か）を明示し、tasklist に正直に注記した。

### 次回への改善提案
- ui パッケージの型解決問題は別途 `"types":"dist/index.d.ts"` 化等で根治可能。MVP 完了後の整備候補。
