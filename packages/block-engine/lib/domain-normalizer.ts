/**
 * ドメインの正規化・バリデーションを担う純粋ロジック。
 *
 * NOTE: 雛形（ステップ0）。実ロジックはステップ1で TDD により実装する。
 */
export const DomainNormalizer = {
  /**
   * 入力文字列を正規化ドメインへ変換する。
   * 計画: trim → スキーム有なら `new URL().hostname` / 無ならパス除去
   *       → 小文字 → 先頭 `www.` 除去 → 末尾ドット・ポート除去
   */
  normalize(input: string): string {
    // TODO(step1): 正規化ロジックを実装
    return input;
  },

  /**
   * 正規化済みドメインが妥当か判定する。
   * 計画: ラベル1個以上・英数字ハイフン・TLD 2文字以上
   */
  isValid(domain: string): boolean {
    // TODO(step1): バリデーションロジックを実装
    return domain.length > 0;
  },
};
