import type { BlockDecision, BlockSite, FocusGateSettings } from './types.js';

/**
 * URL から正規化済みホスト名を取り出す。非 http(s) スキームや不正 URL は null。
 * 正規化: 小文字化・先頭 `www.` 除去。
 */
const extractHost = (url: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed.hostname.toLowerCase().replace(/^www\./, '');
};

/**
 * ホスト名にドメイン部分一致する最初の有効サイトを返す。無ければ null。
 * 部分一致: ホストが `site.domain` と完全一致、または `"." + site.domain` で終端する。
 */
const matchSite = (host: string, sites: BlockSite[]): BlockSite | null => {
  for (const site of sites) {
    if (!site.enabled) continue;
    const d = site.domain.toLowerCase();
    if (host === d || host.endsWith('.' + d)) return site;
  }
  return null;
};

/**
 * URL と設定からブロック判定を行う純粋ロジック。chrome.* 非依存。
 */
export const BlockEngine = {
  /**
   * 与えられた URL に対する判定結果を返す。
   *  1. globalEnabled===false または非 http(s)/不正URL → {blocked:false}
   *  2. host 正規化
   *  3. matchSite で最初にマッチした有効サイト → {blocked:true, level: settings.warningLevel, site}
   */
  decide(url: string, settings: FocusGateSettings): BlockDecision {
    if (!settings.globalEnabled) return { blocked: false };

    const host = extractHost(url);
    if (host === null) return { blocked: false };

    const site = matchSite(host, settings.sites);
    if (!site) return { blocked: false };

    return { blocked: true, level: settings.warningLevel, site };
  },
};
