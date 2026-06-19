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

## フェーズ1: 日本語ロケール（ja）の追加

- [x] `packages/i18n/locales/ja/messages.json` を新規作成
  - [x] `en/messages.json` の全キーを列挙し、同一キー集合で作成
  - [x] FocusGate 固有キー（popupTitle / globalEnabled / warningLevel / levelB / levelC / openOptions / optionsTitle / addSite / domainPlaceholder / labelPlaceholder / edit / save / cancel / delete / noSites / errorInvalidDomain / errorDuplicateDomain / overlayHeading / overlayMessage / proceed / stopBrowsing）を日本語化
  - [x] ボイラープレート由来キー（toggleTheme / injectButton / greeting / hello / displayError* など）を日本語化
  - [x] `extensionName` を "FocusGate"、`extensionDescription` を日本語に設定
  - [x] `greeting` の `placeholders`（$NAME$）構造を en と同形で維持

## フェーズ2: ロケール解決のデフォルト変更

- [x] `chrome-extension/manifest.ts` の `default_locale` を `'en'` → `'ja'` に変更
- [x] `.env` の `CEB_DEV_LOCALE` を `ja` に変更（CLI_* 行は触らない）
- [x] `.example.env` の `CEB_DEV_LOCALE` を `ja` に変更

## フェーズ3: ブロック画面の文言整合

- [x] `blocked.html` / `blocked.js` の文言トーンを他UIと照合し、必要なら微修正（→ 既に日本語かつ他UIと一貫したです・ます調のため**変更なし**）

## フェーズ4: 品質チェックと修正

- [x] `ja/messages.json` と `en/messages.json` のキー差分が無いことを確認（en/ja 各32キー・差分なし）
- [x] 型エラーがないことを確認
  - [x] `pnpm type-check`（本変更起因のエラーなし。`packages/ui` の `@/` 解決による既存エラーが new-tab/devtools-panel/content-runtime に出るが、変更退避（git stash）後も同一に再現する既存事象であり、`pnpm build` のパイプライン内型生成では解消される）
- [x] リントエラーがないことを確認
  - [x] `pnpm lint`（20/20 成功）
- [x] ビルドが成功し `dist/_locales/ja/messages.json` が生成されることを確認
  - [x] `pnpm build`（21/21 成功・`dist/_locales/ja` 生成、`dist/manifest.json` の `default_locale=ja` を確認）

## フェーズ5: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-19

### 計画と実績の差分

**計画と異なった点**:
- ブロック画面（blocked.html/js）は計画段階で微修正の可能性を想定したが、既に他UIと一貫したです・ます調の日本語だったため変更不要だった。
- `pnpm type-check` 単独実行で `packages/ui` の `@/` エイリアス未解決による既存型エラーが検出された。本変更とは無関係であることを git stash で再現確認し、`pnpm build` のパイプライン（型生成を含む）で問題なくビルドできることを確認した。

**新たに必要になったタスク**:
- 型エラーが本変更起因か既存事象かの切り分け（git stash による退避→再ビルド比較）。混在解消の本筋ではないが、検証の信頼性確保のために実施した。

### 学んだこと

**技術的な学び**:
- この i18n 機構は「辞書（locales/<lang>/messages.json）」＋「ロケール解決（本番=manifest.default_locale / 開発=CEB_DEV_LOCALE）」の2点で表示言語が決まる。辞書を追加するだけでは不十分で、解決先のデフォルトを ja に向けて初めて統一される。
- 本番では Chrome の `chrome.i18n.getMessage` が `__MSG_*__`（拡張機能名・説明）も含めて `_locales/<lang>/` を解決するため、`default_locale=ja` にすることで manifest の name/description も日本語辞書から解決される。
- 欠落キーは「そのUIだけ別言語にフォールバック」という新たな混在を生むため、en とのキー集合一致チェックが統一の要になる。

**プロセス上の改善点**:
- tasklist のフェーズを「辞書追加 → ロケール解決変更 → 文言整合 → 検証」と段階分けしたことで、各変更の責務が明確になり、検証時の切り分けも容易だった。

### 次回への改善提案
- 将来 en/ko を実運用する場合に備え、「locales 配下の全ロケールでキー集合一致を検証する」軽量チェック（CI など）を入れると、キー欠落による混在を継続的に防げる。
- ブロック画面の `chrome.i18n` 化を別タスクとして実施すれば、ハードコードを排し全UIを完全にロケール駆動へ統一できる。
