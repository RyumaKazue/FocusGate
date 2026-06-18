// FocusGate レベルC ブロック画面のスクリプト。
// MV3 拡張ページの CSP (script-src 'self') を満たすため外部ファイルに分離している。
// chrome.* には依存しない素の DOM 操作のみ。
//
// ボイラープレートの eslint 設定はブラウザグローバルを *.{ts,tsx} のみに付与するため、
// 素の .js であるこのファイルでは使用するブラウザグローバルを明示宣言する。
/* global URLSearchParams, location, document, history */

(() => {
  const site = new URLSearchParams(location.search).get('site');

  const siteNameEl = document.getElementById('site-name');
  if (siteNameEl) {
    // クエリ値は textContent でのみ挿入し DOM インジェクションを防ぐ。
    siteNameEl.textContent = site && site.trim() !== '' ? site : 'このサイト';
  }

  const backButton = document.getElementById('back-button');
  backButton?.addEventListener('click', () => {
    history.back();
  });
})();
