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

## フェーズ1: 依存追加

- [x] `chrome-extension/package.json` の dependencies に `@extension/block-engine: workspace:*` を追加
- [x] `pnpm install` で workspace リンクを解決

## フェーズ2: navigation.ts の実装

- [x] `chrome-extension/src/background/navigation.ts` を新規作成
  - [x] block-engine / storage から import（`BlockEngine`、`focusgateSettingsStorage`、型 `FocusGateSettings`/`BlockSite`）
  - [x] モジュールスコープ設定キャッシュ `cache` と初期化（`get()` + `subscribe(() => cache = getSnapshot())`）
  - [x] `buildBlockedUrl(site)` を実装（`chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(site.label ?? site.domain)`）
  - [x] `registerNavigation()` を実装（`onBeforeNavigate`、`frameId===0` のみ、`decide` が `blocked && level==='C'` で `chrome.tabs.update`）
  - [x] レベルB の受け皿コメントを残す（ステップ6で `onCompleted` 実装）
  - [x] `chrome.tabs.update` の例外を try/catch で吸収

## フェーズ3: background エントリ接続

- [x] `chrome-extension/src/background/index.ts` を編集
  - [x] theme サンプル（`exampleThemeStorage` のログ）を除去
  - [x] `registerNavigation()` を呼び出す
  - [x] `import 'webextension-polyfill';` は維持

## フェーズ4: 品質チェックと修正

- [x] `pnpm -F chrome-extension type-check` が通過
- [x] `pnpm -F chrome-extension lint` がエラー0（prettier の型注釈改行を lint:fix で自動整形）
- [x] `pnpm build` が成功し `dist/background.js`（31KB）が生成される。`onBeforeNavigate`/`blocked.html`/`focusgate-settings` がバンドルに含まれ、`dist/manifest.json` に `webNavigation` 権限が維持されていることを確認

## フェーズ5: 縦スライス実機確認

- [x] Chrome（一時プロファイル）に dist を読み込み ※ユーザー実機確認済み
- [x] レベルC 設定で `youtube.com` → `blocked.html?site=...` リダイレクトを確認
- [x] `blocked.html` に対象サイト名（`label ?? domain`）が表示される
- [x] `globalEnabled=false` で素通しを確認
- [x] サイト個別 `enabled=false` で素通しを確認
- [x] `m.youtube.com`/`music.youtube.com` でブロック、`notyoutube.com` で素通しを確認
- [x] `blocked.html` 自体が再ブロックされないことを確認
- [x] popup/options 未実装のため、設定変更はデバッグコンソール（SW）から `focusgateSettingsStorage` 経由で行い、`subscribe` 反映を確認

## フェーズ6: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-18

### 計画と実績の差分

**計画と異なった点**:
- 計画どおり。SW の設定キャッシュ（`get()` + `subscribe`）＋ `onBeforeNavigate`(frame0) でのレベルC リダイレクトで縦スライスを貫通。

**新たに必要になったタスク**:
- なし。

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- なし。

### 学んだこと

**技術的な学び**:
- MV3 SW は非永続のため、設定はモジュールスコープにキャッシュし `subscribe` で更新、未構築時のみ `get()` フォールバックする構成が有効。
- `onBeforeNavigate` の `frameId===0` ガードでメインフレームのフルページ遷移のみを対象化。`chrome.tabs.update` の失敗は try/catch で握りつぶし監視全体を止めない。

**プロセス上の改善点**:
- 実機確認（フェーズ5）はユーザー操作前提のため、後続ステップ完了後にまとめて確認・確定した。

### 次回への改善提案
- popup/options 実装前は SW デバッグコンソール経由で設定変更が必要だった。UI 完成後は実機確認が容易になる。
