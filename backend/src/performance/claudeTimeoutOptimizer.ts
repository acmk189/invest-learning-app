/**
 * Claude APIタイムアウト最適化
 *
 * Task 27.2: Claude APIタイムアウト最適化 - タイムアウト設定の最適化と長時間待機防止
 *
 * Claude APIリクエストのタイムアウト設定を最適化し、
 * 長時間待機を防止します。操作タイプごとに異なる
 * タイムアウト値を設定できます。
 *
 * Requirements: 1.8 (5分以内にバッチ完了)
 *
 * @see https://docs.anthropic.com/en/api/rate-limits - Claude API Rate Limits
 */

/**
 * デフォルトのタイムアウト時間(60秒)
 *
 * 通常のニュース要約・用語生成は30秒以内に完了するため、
 * 60秒のタイムアウトで十分なマージンを確保
 */
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * デフォルトの最大タイムアウト時間(2分)
 *
 * バッチ全体の5分制限を考慮し、単一API呼び出しが
 * 長時間ブロックしないよう制限
 */
const DEFAULT_MAX_TIMEOUT_MS = 120000;

/**
 * デフォルトの最小タイムアウト時間(10秒)
 *
 * 短すぎるタイムアウトは誤検出を引き起こすため、
 * 最小値を設定
 */
const DEFAULT_MIN_TIMEOUT_MS = 10000;

/**
 * 操作タイプごとのタイムアウト設定マップ
 */
export type OperationTimeouts = Record<string, number>;

/**
 * タイムアウト設定
 */
export interface ClaudeTimeoutConfig {
  /**
   * デフォルトのタイムアウト時間(ミリ秒)
   * @default 60000
   */
  defaultTimeoutMs?: number;

  /**
   * 最大タイムアウト時間(ミリ秒)
   * この値を超えるタイムアウト設定は制限される
   * @default 120000
   */
  maxTimeoutMs?: number;

  /**
   * 最小タイムアウト時間(ミリ秒)
   * この値を下回るタイムアウト設定は制限される
   * @default 10000
   */
  minTimeoutMs?: number;

  /**
   * 操作タイプごとのタイムアウト設定
   * キーは操作名(例: 'news-summary', 'term-generation')
   */
  operationTimeouts?: OperationTimeouts;

  /**
   * タイムアウト時にリトライするかどうか
   * @default false
   */
  retryOnTimeout?: boolean;

  /**
   * 最大リトライ回数(retryOnTimeoutがtrueの場合)
   * @default 1
   */
  maxRetries?: number;
}

/**
 * 最適化されたリクエストオプション
 *
 * Claude APIリクエストに適用するオプション
 */
export interface OptimizedRequestOptions {
  /** タイムアウト時間(ミリ秒) */
  timeoutMs: number;
  /** タイムアウト時にリトライするか */
  retryOnTimeout: boolean;
  /** 最大リトライ回数 */
  maxRetries: number;
}

/**
 * Claude APIタイムアウト最適化クラス
 *
 * 操作タイプに応じた最適なタイムアウト設定を提供し、
 * 長時間待機を防止します。
 *
 * @example
 * const optimizer = new ClaudeTimeoutOptimizer({
 *   defaultTimeoutMs: 60000,
 *   operationTimeouts: {
 *     'news-summary': 90000,
 *     'term-generation': 45000,
 *   },
 * });
 *
 * const options = optimizer.getOptimizedOptions('news-summary');
 * // options.timeoutMs === 90000
 */
export class ClaudeTimeoutOptimizer {
  private readonly defaultTimeoutMs: number;
  private readonly maxTimeoutMs: number;
  private readonly minTimeoutMs: number;
  private readonly operationTimeouts: OperationTimeouts;
  private readonly retryOnTimeout: boolean;
  private readonly maxRetries: number;

  /**
   * コンストラクタ
   *
   * @param config - タイムアウト設定
   */
  constructor(config: ClaudeTimeoutConfig = {}) {
    this.maxTimeoutMs = config.maxTimeoutMs ?? DEFAULT_MAX_TIMEOUT_MS;
    this.minTimeoutMs = config.minTimeoutMs ?? DEFAULT_MIN_TIMEOUT_MS;
    this.operationTimeouts = config.operationTimeouts ?? {};
    this.retryOnTimeout = config.retryOnTimeout ?? false;
    this.maxRetries = config.retryOnTimeout ? (config.maxRetries ?? 1) : 0;

    // デフォルトタイムアウトを制限内に収める
    const rawDefault = config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.defaultTimeoutMs = this.clampTimeout(rawDefault);
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): ClaudeTimeoutConfig {
    return {
      defaultTimeoutMs: this.defaultTimeoutMs,
      maxTimeoutMs: this.maxTimeoutMs,
      minTimeoutMs: this.minTimeoutMs,
      operationTimeouts: { ...this.operationTimeouts },
      retryOnTimeout: this.retryOnTimeout,
      maxRetries: this.maxRetries,
    };
  }

  /**
   * 最適化されたリクエストオプションを取得
   *
   * 操作タイプに応じたタイムアウト設定を返します。
   * 操作タイプが未定義の場合はデフォルト値を使用します。
   *
   * @param operation - 操作タイプ(省略時はデフォルト)
   * @returns 最適化されたリクエストオプション
   */
  getOptimizedOptions(operation?: string): OptimizedRequestOptions {
    let timeoutMs = this.defaultTimeoutMs;

    // 操作タイプ固有のタイムアウトがあれば使用
    if (operation && this.operationTimeouts[operation] !== undefined) {
      timeoutMs = this.clampTimeout(this.operationTimeouts[operation]);
    }

    return {
      timeoutMs,
      retryOnTimeout: this.retryOnTimeout,
      maxRetries: this.maxRetries,
    };
  }

  /**
   * タイムアウトエラーかどうかを判定
   *
   * @param error - 判定対象のエラー
   * @returns タイムアウトエラーの場合true
   */
  isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // タイムアウト関連のキーワードをチェック
    const timeoutKeywords = ['timeout', 'timed out', 'aborted'];
    const hasTimeoutKeyword = timeoutKeywords.some(
      (keyword) => message.includes(keyword)
    );

    // AbortErrorはタイムアウトとして扱う
    const isAbortError = name === 'aborterror';

    return hasTimeoutKeyword || isAbortError;
  }

  /**
   * 操作タイプの推奨タイムアウトを取得
   *
   * 事前定義された操作タイプのタイムアウト推奨値を返します。
   *
   * @param operation - 操作タイプ
   * @returns 推奨タイムアウト(ミリ秒)
   */
  getRecommendedTimeout(operation: string): number {
    // 事前定義された推奨タイムアウト
    const recommendations: OperationTimeouts = {
      'news-summary': 90000, // ニュース要約は長文処理のため90秒
      'english-news-summary': 90000, // 英語→日本語翻訳+要約のため90秒
      'japanese-news-summary': 60000, // 日本語要約は60秒
      'term-generation': 45000, // 用語生成は短いため45秒
    };

    return recommendations[operation] ?? this.defaultTimeoutMs;
  }

  /**
   * タイムアウト値を許容範囲内に収める
   *
   * @param timeoutMs - 元のタイムアウト値
   * @returns 制限されたタイムアウト値
   */
  private clampTimeout(timeoutMs: number): number {
    return Math.min(Math.max(timeoutMs, this.minTimeoutMs), this.maxTimeoutMs);
  }
}
