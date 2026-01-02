/**
 * 重複判定ロジック
 * Task 10.2: 重複判定ロジック
 *
 * 新規生成された用語が配信済み用語リストに含まれるかを
 * チェックする機能を提供します。
 *
 * Requirements: 4.3, 5.5 (過去30日重複除外、重複なし保証表示)
 *
 * 判定モード:
 * - EXACT: 完全一致（デフォルト）
 * - PARTIAL: 部分一致
 * - SIMILARITY: 類似度ベース
 */

/**
 * 重複チェックモード
 *
 * 用語の重複判定に使用するモードを指定します。
 */
export enum DuplicateCheckMode {
  /**
   * 完全一致モード
   *
   * 用語名が完全に一致する場合のみ重複とみなします。
   * 大文字小文字、全角半角は正規化して比較します。
   */
  EXACT = 'exact',

  /**
   * 部分一致モード
   *
   * 用語名が部分的に含まれる場合も重複とみなします。
   * 例: 「株価収益率（PER）」は「株価収益率」と重複
   */
  PARTIAL = 'partial',

  /**
   * 類似度モード
   *
   * 用語名の類似度が閾値以上の場合に重複とみなします。
   * 例: 「株価収益比率」は「株価収益率」と類似
   */
  SIMILARITY = 'similarity',
}

/**
 * 重複チェック結果
 *
 * 用語の重複チェック結果を表現します。
 */
export interface DuplicateCheckResult {
  /** チェック対象の用語名 */
  termName: string;
  /** 重複しているかどうか */
  isDuplicate: boolean;
  /** マッチした配信済み用語名（重複時のみ） */
  matchedTerm?: string;
  /** マッチタイプ（exact/partial/similarity） */
  matchType?: 'exact' | 'partial' | 'similarity';
  /** 類似度（similarityモード時のみ） */
  similarity?: number;
}

/**
 * 重複チェックオプション
 */
export interface DuplicateCheckerOptions {
  /**
   * チェックモード
   * @default DuplicateCheckMode.EXACT
   */
  mode?: DuplicateCheckMode;

  /**
   * 類似度閾値（similarityモード時）
   * @default 0.7
   */
  similarityThreshold?: number;
}

/**
 * チェック統計
 */
export interface DuplicateCheckerStats {
  /** 総チェック回数 */
  totalChecks: number;
  /** 重複検出回数 */
  duplicatesFound: number;
}

/**
 * 用語名を正規化する
 *
 * 大文字小文字、全角半角、空白を正規化します。
 *
 * @param termName - 正規化する用語名
 * @returns 正規化された用語名
 */
export function normalizeTermName(termName: string): string {
  // 前後の空白を削除
  let normalized = termName.trim();

  // 全角英数字を半角に変換
  normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );

  // 小文字に変換
  normalized = normalized.toLowerCase();

  return normalized;
}

/**
 * 2つの文字列の類似度を計算（レーベンシュタイン距離ベース）
 *
 * @param str1 - 文字列1
 * @param str2 - 文字列2
 * @returns 0〜1の類似度（1が完全一致）
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeTermName(str1);
  const s2 = normalizeTermName(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // レーベンシュタイン距離を計算
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // 削除
        matrix[i][j - 1] + 1, // 挿入
        matrix[i - 1][j - 1] + cost // 置換
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - distance / maxLength;
}

/**
 * 重複チェッカー
 *
 * 新規生成された用語が配信済み用語リストに含まれるかをチェックします。
 *
 * @example
 * const checker = new DuplicateChecker(['PER', 'PBR', 'ROE']);
 *
 * // 完全一致チェック
 * const result = checker.check('PER');
 * if (result.isDuplicate) {
 *   console.log(`${result.termName}は${result.matchedTerm}と重複しています`);
 * }
 *
 * // 部分一致チェック
 * const partialChecker = new DuplicateChecker(terms, {
 *   mode: DuplicateCheckMode.PARTIAL
 * });
 */
export class DuplicateChecker {
  /**
   * 配信済み用語リスト（元の形式）
   */
  private readonly deliveredTerms: string[];

  /**
   * 正規化された配信済み用語マップ
   * key: 正規化された用語名, value: 元の用語名
   */
  private readonly normalizedTermsMap: Map<string, string>;

  /**
   * チェックモード
   */
  private readonly mode: DuplicateCheckMode;

  /**
   * 類似度閾値
   */
  private readonly similarityThreshold: number;

  /**
   * チェック統計
   */
  private stats: DuplicateCheckerStats;

  /**
   * コンストラクタ
   *
   * @param deliveredTerms - 配信済み用語リスト
   * @param options - チェックオプション
   */
  constructor(
    deliveredTerms: string[],
    options: DuplicateCheckerOptions = {}
  ) {
    this.deliveredTerms = [...deliveredTerms];
    this.mode = options.mode ?? DuplicateCheckMode.EXACT;
    this.similarityThreshold = options.similarityThreshold ?? 0.7;

    // 正規化マップを構築
    this.normalizedTermsMap = new Map();
    for (const term of deliveredTerms) {
      const normalized = normalizeTermName(term);
      this.normalizedTermsMap.set(normalized, term);
    }

    // 統計を初期化
    this.stats = {
      totalChecks: 0,
      duplicatesFound: 0,
    };
  }

  /**
   * 用語の重複をチェック
   *
   * @param termName - チェック対象の用語名
   * @returns 重複チェック結果
   */
  check(termName: string): DuplicateCheckResult {
    this.stats.totalChecks++;

    const normalizedInput = normalizeTermName(termName);

    // モードに応じてチェック
    let result: DuplicateCheckResult;

    switch (this.mode) {
      case DuplicateCheckMode.EXACT:
        result = this.checkExact(termName, normalizedInput);
        break;
      case DuplicateCheckMode.PARTIAL:
        result = this.checkPartial(termName, normalizedInput);
        break;
      case DuplicateCheckMode.SIMILARITY:
        result = this.checkSimilarity(termName, normalizedInput);
        break;
      default:
        result = this.checkExact(termName, normalizedInput);
    }

    if (result.isDuplicate) {
      this.stats.duplicatesFound++;
    }

    return result;
  }

  /**
   * 完全一致チェック
   */
  private checkExact(
    termName: string,
    normalizedInput: string
  ): DuplicateCheckResult {
    const matchedTerm = this.normalizedTermsMap.get(normalizedInput);

    if (matchedTerm) {
      return {
        termName,
        isDuplicate: true,
        matchedTerm,
        matchType: 'exact',
      };
    }

    return {
      termName,
      isDuplicate: false,
    };
  }

  /**
   * 部分一致チェック
   */
  private checkPartial(
    termName: string,
    normalizedInput: string
  ): DuplicateCheckResult {
    // まず完全一致をチェック
    const exactResult = this.checkExact(termName, normalizedInput);
    if (exactResult.isDuplicate) {
      return {
        ...exactResult,
        matchType: 'partial', // 部分一致モードでは matchType を partial に
      };
    }

    // 部分一致をチェック
    for (const [normalized, original] of this.normalizedTermsMap.entries()) {
      // 新用語が配信済み用語を含む or 配信済み用語が新用語を含む
      if (
        normalizedInput.includes(normalized) ||
        normalized.includes(normalizedInput)
      ) {
        return {
          termName,
          isDuplicate: true,
          matchedTerm: original,
          matchType: 'partial',
        };
      }
    }

    return {
      termName,
      isDuplicate: false,
    };
  }

  /**
   * 類似度チェック
   */
  private checkSimilarity(
    termName: string,
    normalizedInput: string
  ): DuplicateCheckResult {
    // まず完全一致をチェック
    const exactResult = this.checkExact(termName, normalizedInput);
    if (exactResult.isDuplicate) {
      return {
        ...exactResult,
        matchType: 'similarity',
        similarity: 1,
      };
    }

    // 類似度をチェック
    let bestMatch: { term: string; similarity: number } | null = null;

    for (const [normalized, original] of this.normalizedTermsMap.entries()) {
      const similarity = calculateSimilarity(normalizedInput, normalized);

      if (
        similarity >= this.similarityThreshold &&
        (!bestMatch || similarity > bestMatch.similarity)
      ) {
        bestMatch = { term: original, similarity };
      }
    }

    if (bestMatch) {
      return {
        termName,
        isDuplicate: true,
        matchedTerm: bestMatch.term,
        matchType: 'similarity',
        similarity: bestMatch.similarity,
      };
    }

    return {
      termName,
      isDuplicate: false,
    };
  }

  /**
   * 複数の用語を一括チェック
   *
   * @param termNames - チェック対象の用語名リスト
   * @returns 重複チェック結果のリスト
   */
  checkMultiple(termNames: string[]): DuplicateCheckResult[] {
    return termNames.map((name) => this.check(name));
  }

  /**
   * 重複している用語を抽出
   *
   * @param termNames - チェック対象の用語名リスト
   * @returns 重複している用語名のリスト
   */
  findDuplicates(termNames: string[]): string[] {
    return termNames.filter((name) => this.check(name).isDuplicate);
  }

  /**
   * 重複していない用語を抽出
   *
   * @param termNames - チェック対象の用語名リスト
   * @returns 重複していない用語名のリスト
   */
  findNonDuplicates(termNames: string[]): string[] {
    return termNames.filter((name) => !this.check(name).isDuplicate);
  }

  /**
   * 配信済み用語リストを取得
   *
   * @returns 配信済み用語リスト
   */
  getDeliveredTerms(): string[] {
    return [...this.deliveredTerms];
  }

  /**
   * 配信済み用語を追加
   *
   * @param termName - 追加する用語名
   */
  addDeliveredTerm(termName: string): void {
    this.deliveredTerms.push(termName);
    const normalized = normalizeTermName(termName);
    this.normalizedTermsMap.set(normalized, termName);
  }

  /**
   * 配信済み用語の件数を取得
   *
   * @returns 配信済み用語の件数
   */
  getDeliveredTermCount(): number {
    return this.deliveredTerms.length;
  }

  /**
   * チェック統計を取得
   *
   * @returns チェック統計
   */
  getStats(): DuplicateCheckerStats {
    return { ...this.stats };
  }

  /**
   * 統計をリセット
   */
  resetStats(): void {
    this.stats = {
      totalChecks: 0,
      duplicatesFound: 0,
    };
  }
}
