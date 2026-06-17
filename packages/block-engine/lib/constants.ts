import type { FocusGateSettings } from './types.js';

/**
 * 初期ブロック対象ドメイン（全て既定サイト）。
 */
const DEFAULT_DOMAINS = ['youtube.com', 'tiktok.com', 'instagram.com', 'facebook.com'] as const;

/**
 * chrome.storage.local 上の設定保存キー。
 */
export const STORAGE_KEY = 'focusgate-settings';

/**
 * 初期設定。初回起動時のシードとして使用する。
 * `crypto.randomUUID()` は SW / ブラウザ / Node22 すべてで利用可能。
 */
export const DEFAULT_SETTINGS: FocusGateSettings = {
  version: 1,
  globalEnabled: true,
  warningLevel: 'B',
  sites: DEFAULT_DOMAINS.map(domain => ({
    id: crypto.randomUUID(),
    domain,
    label: null,
    enabled: true,
    isDefault: true,
  })),
};
