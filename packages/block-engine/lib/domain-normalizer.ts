/**
 * ドメインの正規化・バリデーションを担う純粋ロジック。chrome.* 非依存。
 */
export const DomainNormalizer = {
  /**
   * 入力文字列を正規化ドメインへ変換する。
   * 手順: trim → スキーム有なら `new URL().hostname` / 無ならパス除去
   *       → 小文字 → 先頭 `www.` 除去 → 末尾ドット・ポート除去
   */
  normalize(input: string): string {
    let host = input.trim();

    if (/^https?:\/\//i.test(host)) {
      try {
        host = new URL(host).hostname;
      } catch {
        // パース不能ならそのまま後段の整形に委ねる
      }
    } else {
      // スキーム無しはパス（最初の `/` 以降）を除去
      host = host.split('/')[0];
    }

    host = host.toLowerCase();
    host = host.replace(/^www\./, '');
    // 末尾ドット・ポート除去
    host = host.replace(/:\d+$/, '').replace(/\.$/, '');

    return host;
  },

  /**
   * 正規化済みドメインが妥当か判定する。
   * 条件: ラベル（`.` 区切り）2つ以上・各ラベル英数字ハイフンのみ・TLD 2文字以上。
   */
  isValid(domain: string): boolean {
    const labels = domain.split('.');
    if (labels.length < 2) return false;
    if (!labels.every(label => /^[a-z0-9-]+$/.test(label))) return false;

    const tld = labels[labels.length - 1];
    return tld.length >= 2;
  },
};
