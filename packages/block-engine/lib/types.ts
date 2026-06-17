/**
 * 警告レベル。MVP では全体共通で B（確認オーバーレイ）/ C（完全ブロック）の2種。
 */
export type WarningLevel = 'B' | 'C';

/**
 * ブロック対象サイト1件。`domain` は正規化済みドメイン（例: `youtube.com`）。
 */
export interface BlockSite {
  id: string;
  domain: string;
  label: string | null;
  enabled: boolean;
  isDefault: boolean;
}

/**
 * FocusGate 全体の永続設定。chrome.storage.local に `STORAGE_KEY` で保存される。
 */
export interface FocusGateSettings {
  version: number;
  globalEnabled: boolean;
  warningLevel: WarningLevel;
  sites: BlockSite[];
}

/**
 * ある URL に対する判定結果。ブロック時は発動レベルと該当サイトを伴う。
 */
export type BlockDecision = { blocked: false } | { blocked: true; level: WarningLevel; site: BlockSite };
