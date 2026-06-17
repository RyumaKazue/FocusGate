# 要求内容

## 概要

FocusGate MVP の最下層パッケージ `@extension/block-engine` の骨格（パッケージ構成・型・定数・雛形ファイル）を新規作成する。`tsc -b` でビルドする純TSパッケージとして `packages/storage` を雛形に構築する。

## 背景

FocusGate は YouTube/SNS 等の集中阻害サイトを「関所」で制御する Chrome 拡張（MV3）。MVP 実装計画（`docs/mvp-implementation-plan.md`）の「縦スライス優先」方針に従い、判定ロジックの頭脳となる `block-engine` を最初に整備する必要がある。

依存ルール上 `block-engine` は最下層（`chrome.*` 非依存・他 `@extension/*` 非依存）であり、型・定数をここに集約することで上位レイヤー（storage / UI / background）の循環依存を回避する。本ステップ（ステップ0）はその骨格のみを用意し、ロジック実装（ステップ1）の土台を作る。

## 実装対象の機能

### 1. block-engine パッケージ骨格の新規作成
- `packages/storage` を踏襲した `package.json` / `tsconfig.json` / `index.mts` を作成
- `name: "@extension/block-engine"`、scripts に `ready: "tsc -b"` と `test: "vitest run"`
- devDeps に `@extension/tsconfig: workspace:*` と `vitest`

### 2. データモデル（型定義）の集約
- `WarningLevel` / `BlockSite` / `FocusGateSettings` / `BlockDecision` 型を `lib/types.ts` に定義

### 3. 定数の定義
- `STORAGE_KEY = 'focusgate-settings'`
- `DEFAULT_SETTINGS`（version=1, globalEnabled=true, warningLevel='B', 初期4サイト）

### 4. ロジック雛形の用意
- `lib/domain-normalizer.ts`（雛形）
- `lib/block-engine.ts`（雛形）
- これらを `lib/index.ts` / `index.mts` で re-export

### 5. turbo タスク追加
- `turbo.json` の `tasks` に `test`（`dependsOn: ["^ready"]`, `cache: false`）を追加

## 受け入れ条件

### パッケージ骨格
- [ ] `packages/block-engine/` 配下に package.json, tsconfig.json, index.mts, lib/index.ts, lib/types.ts, lib/constants.ts, lib/domain-normalizer.ts, lib/block-engine.ts が存在する
- [ ] `pnpm install` がエラーなく完了する
- [ ] `pnpm -F @extension/block-engine ready` が dist を生成しエラーが出ない
- [ ] `pnpm type-check` が通過する

### 型・定数
- [ ] データモデル4型が `docs/mvp-implementation-plan.md` のとおり定義されている
- [ ] `STORAGE_KEY` と `DEFAULT_SETTINGS`（初期4サイト, 各 enabled:true / isDefault:true / id=crypto.randomUUID()）が定義されている

### turbo
- [ ] `turbo.json` に `test` タスクが追加されている

## 成功指標

- `pnpm -F @extension/block-engine ready` と `pnpm type-check` がともに成功
- 後続ステップ（ステップ1のTDD、ステップ2のstorage連携）が即着手できる骨格が整う

## スコープ外

以下はこのフェーズ（ステップ0）では実装しません:

- `DomainNormalizer` / `BlockEngine` の実ロジック（ステップ1でTDD）
- vitest.config.ts とテストファイル（ステップ1）
- storage 連携 / manifest / SW / UI（ステップ2以降）

## 参照ドキュメント

- `docs/mvp-implementation-plan.md` - MVP 実装計画（ステップ0）
- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書
- `docs/architecture.md` - アーキテクチャ設計書
- `docs/repository-structure.md` - リポジトリ構造定義書
