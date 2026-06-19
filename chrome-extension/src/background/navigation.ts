import { BlockEngine, DomainNormalizer } from '@extension/block-engine';
import { focusgateSettingsStorage } from '@extension/storage';
import type { BlockSite, FocusGateMessage, FocusGateSettings } from '@extension/block-engine';

/**
 * 設定のメモリキャッシュ。判定毎の storage 読み込みを避けるため SW のモジュールスコープに保持し、
 * `subscribe`(liveUpdate) で更新する。未構築時は `get()` にフォールバックする。
 */
let cache: FocusGateSettings | null = null;

/**
 * レベルB の一時許可マップ（tabId → 許可済みドメイン集合）。インメモリのみで永続化しない。
 * 「進む」を選んだタブ・ドメインを記録し、同一タブでの再遷移では B/C とも素通しする。
 * タブを閉じたら（onRemoved）破棄するため、別タブ／開き直しでは再確認になる。
 */
const allowMap = new Map<number, Set<string>>();

/** 当該タブ・ドメインが一時許可済みか。 */
const isAllowed = (tabId: number, domain: string): boolean => allowMap.get(tabId)?.has(domain) ?? false;

/** 当該タブ・ドメインを一時許可に登録する。 */
const allow = (tabId: number, domain: string): void => {
  const domains = allowMap.get(tabId) ?? new Set<string>();
  domains.add(domain);
  allowMap.set(tabId, domains);
};

/**
 * ホストが許可ドメインの範囲内か（完全一致 or サブドメイン）を判定する。
 * `BlockEngine.decide` の matchSite と同じルール。
 */
const hostMatchesDomain = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

/**
 * タブが許可ドメインの圏外（別ドメイン）へ遷移したら、そのタブの一時許可を破棄する。
 * 許可済みドメイン（およびそのサブドメイン）内の遷移では維持する。
 * `normalize` は全域関数のため try/catch 不要。
 */
const revokeIfDomainChanged = (tabId: number, url: string): void => {
  const allowed = allowMap.get(tabId);
  if (!allowed) return;
  const host = DomainNormalizer.normalize(url);
  if (![...allowed].some(domain => hostMatchesDomain(host, domain))) {
    allowMap.delete(tabId);
  }
};

/**
 * 設定キャッシュを初期化し、以降の変更を購読してキャッシュへ反映する。
 */
const initSettingsCache = async (): Promise<void> => {
  cache = await focusgateSettingsStorage.get();
  focusgateSettingsStorage.subscribe(() => {
    cache = focusgateSettingsStorage.getSnapshot();
  });
};

/**
 * 現在の設定を返す。キャッシュ未構築時のみ storage から取得する。
 */
const getSettings = async (): Promise<FocusGateSettings> => cache ?? (await focusgateSettingsStorage.get());

/**
 * レベルC のリダイレクト先 URL を組み立てる。
 * 対象サイト名はラベル優先で `?site=` に渡す（受け側 blocked.js は textContent で安全に表示）。
 */
const buildBlockedUrl = (site: BlockSite): string =>
  chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(site.label ?? site.domain);

/**
 * `onBeforeNavigate`（メインフレーム）でブロック判定を行い、
 * レベルC のときは描画前に当該タブを blocked.html へ置換する。
 */
const handleBeforeNavigate = async (
  details: chrome.webNavigation.WebNavigationParentedCallbackDetails,
): Promise<void> => {
  // メインフレームのフルページ遷移のみを対象にする（iframe 等は無視）。
  if (details.frameId !== 0) return;

  // 許可ドメイン圏外へ遷移したタブは、判定より前に一時許可を破棄する。
  revokeIfDomainChanged(details.tabId, details.url);

  const settings = await getSettings();
  const decision = BlockEngine.decide(details.url, settings);

  // 「進む」で一時許可済みのタブ・ドメインは B/C とも素通しする。
  if (decision.blocked && isAllowed(details.tabId, decision.site.domain)) return;

  if (decision.blocked && decision.level === 'C') {
    try {
      await chrome.tabs.update(details.tabId, { url: buildBlockedUrl(decision.site) });
    } catch (error) {
      // タブが既に閉じている等の競合は監視全体を止めないよう握りつぶす。
      console.error('[FocusGate] failed to redirect to blocked page', error);
    }
    return;
  }

  // レベルB は描画完了後の onCompleted で確認オーバーレイを出す。
};

/**
 * `onCompleted`（メインフレーム）でブロック判定を行い、レベルB かつ未許可のときに
 * content の確認オーバーレイを起動する。content script は描画後注入のため、
 * レベルC（onBeforeNavigate）と異なり描画完了後のこのタイミングで発火する。
 */
const handleCompleted = async (details: chrome.webNavigation.WebNavigationFramedCallbackDetails): Promise<void> => {
  if (details.frameId !== 0) return;

  const settings = await getSettings();
  const decision = BlockEngine.decide(details.url, settings);

  if (decision.blocked && decision.level === 'B' && !isAllowed(details.tabId, decision.site.domain)) {
    try {
      await chrome.tabs.sendMessage(details.tabId, { type: 'SHOW_WARNING', site: decision.site });
    } catch {
      // content script 未注入のページ（chrome:// 等）への送信失敗は握りつぶす。
    }
  }
};

/**
 * content からの操作結果を受ける。「進む」で当該タブ・ドメインを一時許可に登録する。
 * 「やめる」は SW 側では何もしない（離脱は content の history.back() が担う）。
 */
const handleMessage = (message: FocusGateMessage, sender: chrome.runtime.MessageSender): void => {
  if (message.type !== 'WARNING_RESULT') return;
  const tabId = sender.tab?.id;
  if (tabId !== undefined && message.action === 'proceed') {
    allow(tabId, message.domain);
  }
};

/**
 * ナビゲーション監視を起動する。SW エントリ（background/index.ts）から一度だけ呼ぶ。
 */
export const registerNavigation = (): void => {
  void initSettingsCache();
  chrome.webNavigation.onBeforeNavigate.addListener(handleBeforeNavigate);
  chrome.webNavigation.onCompleted.addListener(handleCompleted);
  chrome.runtime.onMessage.addListener(handleMessage);
  // タブが閉じられたら当該タブの一時許可を破棄する。
  chrome.tabs.onRemoved.addListener(tabId => allowMap.delete(tabId));
};
