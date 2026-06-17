import type { BlockDecision, FocusGateSettings } from './types.js';

/**
 * URL と設定からブロック判定を行う純粋ロジック。chrome.* 非依存。
 *
 * NOTE: 雛形（ステップ0）。実ロジックはステップ1で TDD により実装する。
 */
export const BlockEngine = {
  /**
   * 与えられた URL に対する判定結果を返す。
   * 計画:
   *  1. globalEnabled===false または非 http(s) → {blocked:false}
   *  2. host 正規化
   *  3. matchSite（host が site.domain と完全一致 or "."+site.domain で終端、
   *     かつ site.enabled）で最初にマッチした有効サイト
   *     → {blocked:true, level: settings.warningLevel, site}
   */
  decide(url: string, settings: FocusGateSettings): BlockDecision {
    // TODO(step1): 判定ロジックを実装。シグネチャはステップ1の契約として確定済み。
    void url;
    void settings;
    return { blocked: false };
  },
};
