import type { BlockSite } from './types.js';

/**
 * SW → content。レベルB の確認オーバーレイ表示を指示する。
 * 対象サイト情報を載せ、content 側は再判定せずそのまま表示に使う。
 */
export interface ShowWarningMessage {
  type: 'SHOW_WARNING';
  site: BlockSite;
}

/**
 * content → SW。確認オーバーレイでのユーザー操作結果。
 * `proceed` は当該タブ・ドメインの一時許可登録に使う。`cancel` の離脱は content 側が担う。
 */
export interface WarningResultMessage {
  type: 'WARNING_RESULT';
  action: 'proceed' | 'cancel';
  domain: string;
}

/**
 * FocusGate の SW ⇔ content 間メッセージの総称。
 */
export type FocusGateMessage = ShowWarningMessage | WarningResultMessage;
