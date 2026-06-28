# 設計書

## アーキテクチャ概要

ポップアップの表示サイズは `pages/popup/src/index.css` の `body` 要素に対する `width`/`height` 指定で決まる。この値を変更するだけのスタイル変更であり、ロジックやコンポーネント構造への影響はない。

```
pages/popup/index.html
  └─ body (サイズ指定: index.css)
       └─ #app-container (Reactアプリのマウント先)
```

## コンポーネント設計

### 1. ポップアップスタイル (`pages/popup/src/index.css`)

**責務**:
- ポップアップウィンドウの表示サイズ（body の width/height）を定義する
- ルート要素を body の高さいっぱいに広げるための高さチェーンを定義する

**実装の要点**:
- `width: 300px` → `width: 400px`
- `height: 260px` → `height: 360px`
- `html, body` に `height: 100%` を付与し、`#app-container { height: 100% }` を追加して、Reactのマウント先がbodyの高さ（360px）いっぱいに広がるようにする

### 2. Popup レイアウト (`pages/popup/src/Popup.tsx`)

**責務**:
- UIコンテンツを body の高さいっぱいに広げ、下部の空白をなくす

**実装の要点**:
- ルートdiv（`flex min-w-[18rem] flex-col ...`）に `h-full` を付与し、`#app-container`（=360px）いっぱいに広げる
- サイトリストの `ul` に `flex-1 overflow-y-auto` を付与し、余白を吸収させる（サイト数が少なくても空白が生じず、多い場合はスクロール）
- これにより、ヘッダー・レベル選択は上部、操作ボタンは下部に自然に配置される

**補足（既存コードの所見）**:
- `Popup.css` の `.App` クラスはボイラープレートの残骸で、現在の `Popup.tsx` では使用されていない（Tailwindクラスでスタイリングしている）。今回の修正では `.App` には依存しない。

## データフロー

### ポップアップ表示
```
1. ユーザーがツールバーの拡張機能アイコンをクリック
2. index.html が読み込まれ、body のサイズ（index.css）でウィンドウが確定
3. React アプリが #app-container にマウントされ、.App が body 全体に広がる
```

## エラーハンドリング戦略

スタイル値の変更のみのため、エラーハンドリングの追加・変更は不要。

## テスト戦略

### ユニットテスト
- 対象なし（CSSの定数変更のため）

### 統合テスト
- ビルド・型チェック・リントの成功で品質を担保

## 依存ライブラリ

新規追加なし。

## ディレクトリ構造

```
pages/popup/src/index.css  (変更)
pages/popup/src/Popup.tsx  (変更)
```

## 実装の順序

1. `pages/popup/src/index.css` の `body` の width/height を変更
2. `pages/popup/src/index.css` に高さチェーン（html/body height:100%, #app-container height:100%）を追加
3. `pages/popup/src/Popup.tsx` のルートdivに `h-full`、`ul` に `flex-1 overflow-y-auto` を付与
4. 型チェック・リント・ビルドで検証

## セキュリティ考慮事項

- なし

## パフォーマンス考慮事項

- なし（表示サイズの変更のみ）

## 将来の拡張性

- 将来的にサイズをテーマや設定で可変にする場合は、CSS変数化を検討できる（今回はスコープ外）。
