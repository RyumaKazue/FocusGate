import { BlockEngine } from '@extension/block-engine';
import { focusgateSettingsStorage } from '@extension/storage';
import type { BlockSite, FocusGateSettings } from '@extension/block-engine';

/**
 * 設定のメモリキャッシュ。判定毎の storage 読み込みを避けるため SW のモジュールスコープに保持し、
 * `subscribe`(liveUpdate) で更新する。未構築時は `get()` にフォールバックする。
 */
let cache: FocusGateSettings | null = null;

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

  const settings = await getSettings();
  const decision = BlockEngine.decide(details.url, settings);

  if (decision.blocked && decision.level === 'C') {
    try {
      await chrome.tabs.update(details.tabId, { url: buildBlockedUrl(decision.site) });
    } catch (error) {
      // タブが既に閉じている等の競合は監視全体を止めないよう握りつぶす。
      console.error('[FocusGate] failed to redirect to blocked page', error);
    }
    return;
  }

  // レベルB は描画完了後の onCompleted で確認オーバーレイを出す（ステップ6で実装）。
};

/**
 * ナビゲーション監視を起動する。SW エントリ（background/index.ts）から一度だけ呼ぶ。
 */
export const registerNavigation = (): void => {
  void initSettingsCache();
  chrome.webNavigation.onBeforeNavigate.addListener(handleBeforeNavigate);
};
