import { t } from '@extension/i18n';
import { useEffect, useState } from 'react';
import type { BlockSite, FocusGateMessage, WarningResultMessage } from '@extension/block-engine';

/** 操作結果を SW へ送る。受信側不在等の失敗は握りつぶす（離脱処理を妨げない）。 */
const sendResult = (action: WarningResultMessage['action'], domain: string): void => {
  const message: WarningResultMessage = { type: 'WARNING_RESULT', action, domain };
  try {
    void chrome.runtime.sendMessage(message);
  } catch {
    // SW 不在等は無視
  }
};

/**
 * レベルB の確認オーバーレイ。全ページに常駐するが既定は非表示（null 描画）で、
 * SW からの `SHOW_WARNING` 受信時のみ表示する。
 */
export default function App() {
  const [site, setSite] = useState<BlockSite | null>(null);

  useEffect(() => {
    const onMessage = (message: FocusGateMessage) => {
      if (message.type === 'SHOW_WARNING') {
        setSite(message.site);
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  if (!site) {
    return null;
  }

  const handleProceed = () => {
    sendResult('proceed', site.domain);
    setSite(null);
  };

  const handleStop = () => {
    sendResult('cancel', site.domain);
    history.back();
  };

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-gray-900/80 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg bg-white p-6 text-center shadow-xl">
        <h1 className="text-lg font-bold text-gray-900">{t('overlayHeading')}</h1>
        <p className="text-sm text-gray-600">{t('overlayMessage')}</p>
        <p className="text-base font-semibold text-gray-900">{site.label ?? site.domain}</p>
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={handleStop}
            className="flex-1 rounded bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600">
            {t('stopBrowsing')}
          </button>
          <button
            type="button"
            onClick={handleProceed}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            {t('proceed')}
          </button>
        </div>
      </div>
    </div>
  );
}
