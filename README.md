<div align="center">

# FocusGate

集中を妨げるサイトを段階的に抑止する Chrome 拡張機能

![](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![](https://badges.aleen42.com/src/vitejs.svg)

</div>

## 概要

FocusGate は、ついつい開いてしまう「集中を妨げるサイト」への到達を、ユーザー自身が選んだ強さで抑止するための Chrome 拡張機能です。

強制的に遮断するだけでなく、抑止の強さを段階的に選べるため、無理なく行動変容を促せます。ブラウザの新しいタブやツールバーのアイコンから、対象サイトや抑止レベルをいつでも調整できます。

## 主な機能

- **段階的な警告レベル**
  - **レベル B（確認）**: 対象サイトを開こうとすると確認のワンクッションを挟み、「本当に開きますか？」と問いかけます。ユーザーがボタンを押せばページに進めます。
  - **レベル C（ブロック）**: 対象サイトへの遷移をブロックし、専用のブロック画面を表示します。
- **ブロックリストの管理**: 任意のドメインを抑止対象として追加・編集・削除できます（ポップアップ／オプションページ）。
- **ブロックの ON/OFF**: 集中したいときと休憩したいときを、グローバルなスイッチで切り替えられます。
- **設定の永続化**: 設定はローカルストレージに保存され、ブラウザを再起動しても維持されます。
- **日本語UI**: ポップアップ・オプション・確認オーバーレイ・ブロック画面を日本語で表示します（i18n により多言語へ拡張可能）。

## 技術スタック

ベースに [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite) を採用しています。

- [React](https://reactjs.org/) / [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) + [Turborepo](https://turbo.build/repo)（モノレポ・高速ビルド）
- [Tailwind CSS](https://tailwindcss.com/)
- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- 独自 i18n パッケージ（[`packages/i18n`](packages/i18n/)）
- [ESLint](https://eslint.org/) / [Prettier](https://prettier.io/)
- [WebdriverIO](https://webdriver.io/) による E2E テスト

## セットアップ

1. このリポジトリをクローンします。
   ```bash
   git clone https://github.com/RyumaKazue/FocusGate
   ```
2. Node のバージョンを `.nvmrc` 以上に揃えます（[nvm](https://github.com/nvm-sh/nvm) 推奨）。
3. pnpm をインストールします。
   ```bash
   npm install -g pnpm
   ```
4. 依存関係をインストールします。
   ```bash
   pnpm install
   ```

### Chrome

1. ビルドを実行します。
   - 開発: `pnpm dev`
   - 本番: `pnpm build`
2. ブラウザで `chrome://extensions` を開きます。
3. <kbd>デベロッパーモード</kbd> を有効にします。
4. <kbd>パッケージ化されていない拡張機能を読み込む</kbd> をクリックします。
5. プロジェクトの `dist` ディレクトリを選択します。

### Firefox

1. ビルドを実行します。
   - 開発: `pnpm dev:firefox`
   - 本番: `pnpm build:firefox`
2. ブラウザで `about:debugging#/runtime/this-firefox` を開きます。
3. <kbd>一時的なアドオンを読み込む</kbd> をクリックします。
4. `./dist/manifest.json` を選択します。

> [!NOTE]
> Firefox では一時的なアドオンとして読み込むため、ブラウザを閉じると無効になります。起動のたびに読み込み直してください。

## プロジェクト構成

- [`chrome-extension`](chrome-extension/) - マニフェスト生成（[`manifest.ts`](chrome-extension/manifest.ts)）とバックグラウンド（Service Worker）、ブロック画面（[`public/blocked.html`](chrome-extension/public/)）
- [`pages`](pages/) - 拡張機能の各サーフェス
  - [`popup`](pages/popup/) - ツールバーアイコンのポップアップ（ブロックの ON/OFF・警告レベル・サイト一覧）
  - [`options`](pages/options/) - オプションページ（ブロックリストの管理）
  - [`content-ui`](pages/content-ui/) - ページに注入する React コンポーネント（レベル B の確認オーバーレイ）
  - [`content`](pages/content/) / [`content-runtime`](pages/content-runtime/) - コンテンツスクリプトの基盤
- [`packages`](packages/) - 共有パッケージ
  - `block-engine` - 抑止判定・メッセージ型などのコアロジック
  - `storage` - 設定の永続化ヘルパー（`focusgateSettingsStorage` など）
  - `i18n` - 型安全な多言語化
  - `shared` / `ui` / `hmr` / `env` / `dev-utils` / `tailwindcss-config` / `tsconfig` / `vite-config` ほか
- [`docs`](docs/) - プロダクト要求・機能設計・アーキテクチャ等の永続ドキュメント
- [`.steering`](.steering/) - 作業単位ごとの計画・タスク・振り返り

## ドキュメント

- [`docs/product-requirements.md`](docs/product-requirements.md) - プロダクト要求定義書
- [`docs/functional-design.md`](docs/functional-design.md) - 機能設計書
- [`docs/architecture.md`](docs/architecture.md) - アーキテクチャ設計書
- [`docs/repository-structure.md`](docs/repository-structure.md) - リポジトリ構造定義書
- [`docs/development-guidelines.md`](docs/development-guidelines.md) - 開発ガイドライン

## ライセンス

[MIT](LICENSE)
