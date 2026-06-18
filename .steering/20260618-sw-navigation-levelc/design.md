# 設計書

## アーキテクチャ概要

Service Worker に「ナビゲーション監視 → 判定 → レベルC リダイレクト」の縦スライスを通す。判定ロジック（`BlockEngine`）と設定（`focusgateSettingsStorage`）は既存パッケージを再利用し、SW 側は chrome.* イベントの配線と設定キャッシュのみを担う。

```
chrome.webNavigation.onBeforeNavigate (frameId 0)
        │ details.url / details.tabId
        ▼
BlockEngine.decide(url, cache)  ◀── cache: モジュールスコープ設定
        │                              ▲ subscribe(liveUpdate) で更新
        ▼                              │ 初回 get() で構築
   blocked && level==='C'        focusgateSettingsStorage
        │
        ▼
chrome.tabs.update(tabId, { url: blocked.html?site=... })
```

## コンポーネント設計

### 1. navigation.ts（`chrome-extension/src/background/navigation.ts`・新規）

**責務**:
- 設定のメモリキャッシュ管理
- `onBeforeNavigate` の購読とレベルC リダイレクト

**実装の要点**:

**設定キャッシュ**:
- モジュールスコープ `let cache: FocusGateSettings | null = null;`
- 初期化関数で `cache = await focusgateSettingsStorage.get();` を実行し、`focusgateSettingsStorage.subscribe(() => { cache = focusgateSettingsStorage.getSnapshot(); });` を登録
- 判定時は `const settings = cache ?? (await focusgateSettingsStorage.get());`（未構築時フォールバック）

**registerNavigation()**:
- `chrome.webNavigation.onBeforeNavigate.addListener(handler)` を登録
- `handler(details)`:
  - `if (details.frameId !== 0) return;`（メインフレームのみ）
  - 設定取得（キャッシュ）→ `const decision = BlockEngine.decide(details.url, settings);`
  - `if (decision.blocked && decision.level === 'C') { await chrome.tabs.update(details.tabId, { url: buildBlockedUrl(decision.site) }); }`
  - レベルB は「// レベルB は onCompleted で処理する（ステップ6）」のコメントのみ残す

**buildBlockedUrl(site)**:
- `chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(site.label ?? site.domain)`

**型・lint 注意**:
- `func-style: expression` 規約のためアロー関数式で定義
- chrome の webNavigation 型は `@types/chrome` 由来。`details` の型は推論に任せるか `chrome.webNavigation.WebNavigationParentedCallbackDetails` 等で明示

### 2. background/index.ts（編集）

**責務**: SW エントリで監視を起動

**実装の要点**:
- 既存の theme サンプル（`exampleThemeStorage.get().then(...)` と関連ログ）を削除
- `import 'webextension-polyfill';` は維持
- `registerNavigation();` を呼び出す
- 起動ログは最小限に整理（任意）

### 3. chrome-extension/package.json（編集）

**責務**: block-engine 依存の宣言

**実装の要点**:
- `dependencies` に `"@extension/block-engine": "workspace:*"` を追加（`BlockEngine` import のため）
- `@extension/storage` は既存（`focusgateSettingsStorage` はここから import）

## データフロー

### レベルC リダイレクト
```
1. ユーザーが youtube.com へフルページ遷移
2. onBeforeNavigate(details) 発火（frameId 0）
3. settings = cache（未構築なら get()）
4. BlockEngine.decide(details.url, settings)
   - globalEnabled=false → {blocked:false} → 何もしない
   - 非対象/個別OFF/非http → {blocked:false} → 何もしない
   - 対象かつ level==='C' → {blocked:true, level:'C', site}
5. chrome.tabs.update(tabId, blocked.html?site=encodeURIComponent(label??domain))
6. blocked.html 表示（描画前に置換されるため対象ページは見えない）
```

### 設定変更の反映
```
popup/options が focusgateSettingsStorage.set 系を呼ぶ
  ▼ liveUpdate により subscribe リスナー発火
  ▼ cache = getSnapshot()
  ▼ 次の onBeforeNavigate から新設定で判定
```

## エラーハンドリング戦略

- `chrome.tabs.update` は `await` し、例外は監視全体を止めないよう try/catch で握る（タブが既に閉じている等の競合を吸収。最小実装では console.error 程度）
- `cache` 未構築時は `get()` フォールバックで判定を欠落させない
- `BlockEngine.decide` は不正 URL でも `{blocked:false}` を返すため SW 側で URL パース例外を扱う必要はない

## テスト戦略

### 手動テスト（縦スライス実機）
- `pnpm dev` で dist を Chrome（一時プロファイル）に読込
- DevTools（SW）で `focusgateSettingsStorage.setWarningLevel('C')` 相当を実行（または options 未実装のため一時的にデバッグコンソールで設定変更）
- `youtube.com` を開く → `blocked.html?site=YouTube` にリダイレクトされることを確認
- `globalEnabled=false` で素通し、`m.youtube.com`/`music.youtube.com` でブロック、`notyoutube.com` で素通しを確認
- Chrome DevTools MCP で `blocked.html` への遷移結果・コンソールエラー無しを確認可能な範囲で検証

### 自動テスト
- なし（SW は chrome.* イベント依存のため手動確認。判定ロジックは block-engine で検証済み）

## 依存ライブラリ

- 追加: `@extension/block-engine: workspace:*`（chrome-extension の dependencies）
- 既存利用: `@extension/storage`（`focusgateSettingsStorage`）、`webextension-polyfill`、`@types/chrome`（webNavigation/tabs 型）

## ディレクトリ構造

```
chrome-extension/
├── package.json                    (編集: block-engine 依存追加)
└── src/background/
    ├── index.ts                    (編集: theme サンプル除去 + registerNavigation 呼び出し)
    └── navigation.ts               (新規: キャッシュ + onBeforeNavigate + レベルC リダイレクト)
```

## 実装の順序

1. `chrome-extension/package.json` に block-engine 依存を追加し `pnpm install`
2. `navigation.ts` を作成（キャッシュ初期化 → `registerNavigation` → `buildBlockedUrl`）
3. `background/index.ts` を編集（theme サンプル除去・`registerNavigation()` 呼び出し）
4. `type-check` / `lint` を通す
5. `pnpm build` で `dist/background.js` 生成を確認
6. Chrome に dist を読み込み、縦スライスを実機確認

## セキュリティ考慮事項

- 介入は `blocked: true && level==='C'` のときのみ。それ以外のナビゲーションには一切作用しない（権限最小化方針）
- `?site=` に渡す値は `encodeURIComponent` でエンコード。受け側 `blocked.js` は `textContent` で挿入済み（XSS 防止）
- `webNavigation`/`tabs` 権限は manifest に宣言済み（ステップ3 で `webNavigation` 追加、`tabs` は既存）

## パフォーマンス考慮事項

- 設定はメモリキャッシュから読むため、判定は `BlockEngine.decide`（O(サイト数) の線形探索）のみで完結し 50ms 要件を満たす
- `onBeforeNavigate` は frameId 0 で早期リターンし、サブフレームの無駄な判定を避ける

## 将来の拡張性

- レベルB の `onCompleted` ハンドラと一時許可マップ（ステップ6）は本モジュールに追記する形で拡張可能。受け皿コメントを残す
- SPA 内遷移対応（`onHistoryStateUpdated`）も同じ判定経路を再利用して Post-MVP で追加できる
