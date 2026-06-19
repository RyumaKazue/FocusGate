# 設計書

## アーキテクチャ概要

popup / options は React コンポーネントとして `focusgateSettingsStorage` を単一の窓口とする。`useStorage` フック（`@extension/shared`）で購読し、`createStorage` の `liveUpdate:true` により別画面・SW での変更が `chrome.storage.onChanged` 経由で全購読者へ伝播する。UI は `chrome.storage` を直接触らず、必ず storage の補助関数（`setGlobalEnabled` / `setWarningLevel` / `addSite` / `updateSite` / `removeSite` / `toggleSite`）のみを呼ぶ。

```
focusgateSettingsStorage (chrome.storage.local, liveUpdate)
        ├── useStorage → Popup.tsx   (全体/レベル/個別トグル, optionsリンク)
        ├── useStorage → Options.tsx (一覧/追加/編集/削除/トグル)
        └── subscribe  → SW navigation.ts (ブロック判定キャッシュ) ※既存
```

## コンポーネント設計

### 1. Popup.tsx

**責務**:
- 全体 ON/OFF・警告レベル B/C・サイト個別 ON/OFF の即時操作
- options ページへの導線

**実装の要点**:
- `const settings = useStorage(focusgateSettingsStorage)` で `FocusGateSettings` を取得
- 全体トグル・レベル切替・サイトトグルは storage 補助関数を直接呼ぶ（state はストレージが唯一の真実）
- options リンクは `chrome.runtime.openOptionsPage()`
- theme サンプル（`exampleThemeStorage` / `injectContentScript` / `ToggleButton`）を全除去
- 汎用トグルは素の `<button>` + `cn` で自前実装（`ToggleButton` は theme 専用のため不使用）
- 200ms 要件のため settings 以外の重い初期化を行わない

### 2. Options.tsx

**責務**:
- 登録サイト一覧の表示と CRUD 操作

**実装の要点**:
- `useStorage(focusgateSettingsStorage)` で `sites` を取得しリスト描画
- 追加フォーム: ローカル state（domain 入力・label 入力・errorKey）。`addSite` を try/catch し、`INVALID_DOMAIN` / `DUPLICATE_DOMAIN` を i18n メッセージにマップして表示。成功時は入力欄クリア
- 編集: 各行をインライン編集（編集中行の id をローカル state で保持）。確定時 `updateSite(id, patch)` を try/catch しエラー表示
- 削除: `removeSite(id)`。初期4サイト（`isDefault`）も追加サイトと一律に削除可能とし特別扱いしない（`isDefault` は UI 上のラベル表示のみに使用、あるいは未使用）
- 個別トグル: `toggleSite(id)`
- theme サンプルを全除去

### 3. i18n メッセージ

**責務**: UI 文言の集中管理

**実装の要点**:
- `packages/i18n/locales/en/messages.json` と `ko/messages.json` に同一キーを追加
- 追加キー（例）: `popupTitle` / `globalEnabled` / `warningLevel` / `levelB` / `levelC` / `openOptions` / `optionsTitle` / `addSite` / `domainPlaceholder` / `labelPlaceholder` / `edit` / `save` / `cancel` / `delete` / `errorInvalidDomain` / `errorDuplicateDomain`
- `t('key')` で参照。i18n の型はビルド時生成のため、メッセージ追加後に `pnpm -F @extension/i18n ready`（または `pnpm build`）で型を再生成

## データフロー

### 全体 ON/OFF（popup）
```
1. ユーザーが全体トグルをクリック
2. focusgateSettingsStorage.setGlobalEnabled(!current)
3. chrome.storage.local 更新 → onChanged 発火
4. useStorage（popup/options）が再描画、SW の subscribe がキャッシュ更新
5. 以降のナビゲーションで BlockEngine.decide が新値で判定
```

### サイト追加（options）
```
1. domain 入力 → 「追加」押下
2. addSite({domain, label}) が normalize + isValid + 重複チェック
3. 成功 → sites に push、入力欄クリア、popup 一覧へ即時反映
4. 失敗 → throw（INVALID_DOMAIN/DUPLICATE_DOMAIN）→ catch して i18n エラー表示
```

## エラーハンドリング戦略

### エラーハンドリングパターン
- storage 補助関数が投げる `Error('INVALID_DOMAIN')` / `Error('DUPLICATE_DOMAIN')` / `Error('SITE_NOT_FOUND')` を UI 側で `error.message` により分岐
- フォーム単位で `errorKey` state を持ち、対応する i18n メッセージを赤字表示
- 想定外エラーは `withErrorBoundary` の `ErrorDisplay` に委譲

## テスト戦略

### ユニットテスト
- なし（block-engine のみ TDD 方針。UI は手動確認）

### 統合テスト（手動）
- popup 全体OFF→素通し / ON→再ブロック、B/C 切替が SW に反映（C=リダイレクト）
- options 追加が popup 一覧へ即時反映、無効/重複ドメインでエラー、個別OFF で当該サイトのみ素通し
- popup ⇔ options の相互整合

## 依存ライブラリ

新規追加なし。既存の `@extension/shared`（`useStorage` / `withErrorBoundary` / `withSuspense`）、`@extension/ui`（`cn` / `LoadingSpinner` / `ErrorDisplay`）、`@extension/i18n`（`t`）、`@extension/storage`（`focusgateSettingsStorage`）を再利用。

## ディレクトリ構造

```
pages/popup/src/Popup.tsx       （編集: theme置換）
pages/options/src/Options.tsx   （編集: theme置換）
packages/i18n/locales/en/messages.json  （編集: キー追加）
packages/i18n/locales/ko/messages.json  （編集: キー追加）
```

## 実装の順序

1. i18n メッセージ追加（en/ko）＋型再生成
2. Popup.tsx を FocusGate UI に置換
3. Options.tsx を FocusGate UI に置換
4. 品質チェック（type-check / lint / build）
5. 手動実機確認

## セキュリティ考慮事項

- ユーザー入力ドメインは storage 補助関数内で normalize/isValid 済み。UI 側で生 URL を信頼しない
- `chrome.runtime.openOptionsPage()` のみ使用し任意 URL 遷移を行わない

## パフォーマンス考慮事項

- popup は settings のみ読む軽量初期化（200ms 表示要件）
- リスト描画は sites 件数が小さい（MVP は数件）ため最適化不要

## 将来の拡張性

- レベルB オーバーレイ（ステップ6）は storage の値をそのまま利用するため UI 変更不要
- サイトごとのレベル指定など将来拡張時も storage 補助関数を増やす形で UI を拡張できる
