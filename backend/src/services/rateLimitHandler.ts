/**
 * レート制限ハンドラー
 * Task 3.4: レート制限ハンドリング
 *
 * Claude API（Anthropic）のレート制限エラーを検出し、
 * 適切な待機・リトライ処理を提供します。
 *
 * Requirements: 12.5 (Claude API使用)
 *
 * @see https://docs.anthropic.com/en/api/rate-limits
 */

import { AppError, ErrorType, ErrorSeverity } from '../errors/types';

/**
 * レート制限エラー
 *
 * API呼び出しがレート制限に達した場合にスローされるエラー。
 * Anthropic APIは429ステータスコードとretry-afterヘッダーを返します。
 */
export class RateLimitError extends AppError {
  /**
   * リトライまでの待機秒数
   * APIから提供される場合に設定される
   */
  public readonly retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number, originalError?: Error) {
    // レート制限エラーはリトライ可能
    super(message, ErrorType.API, ErrorSeverity.MEDIUM, true, originalError);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * レート制限エラーかどうかを判定する
 *
 * Anthropic SDKやその他のHTTPエラーがレート制限エラーかを検出します。
 * 以下の条件でレート制限エラーと判定されます：
 * - error.name が 'RateLimitError' の場合
 * - error.status が 429 の場合
 * - error.statusCode が 429 の場合
 *
 * @param error - 判定するエラーオブジェクト
 * @returns レート制限エラーの場合true
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as Record<string, unknown>;

  // Anthropic SDKのRateLimitErrorをチェック
  if (err.name === 'RateLimitError') {
    return true;
  }

  // HTTPステータスコード 429 をチェック
  if (err.status === 429 || err.statusCode === 429) {
    return true;
  }

  return false;
}

/**
 * エラーからretry-after値を抽出する
 *
 * Anthropic APIはレート制限時にretry-afterヘッダーで
 * 待機すべき秒数を返します。
 *
 * @param error - エラーオブジェクト
 * @returns リトライまでの秒数、取得できない場合はundefined
 */
export function extractRetryAfter(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const err = error as Record<string, unknown>;

  // headersからretry-afterを取得
  if (err.headers && typeof err.headers === 'object') {
    const headers = err.headers as Record<string, string>;
    const retryAfter = headers['retry-after'];

    if (retryAfter) {
      const seconds = parseFloat(retryAfter);
      if (!isNaN(seconds)) {
        // 小数点は切り上げ
        return Math.ceil(seconds);
      }
    }
  }

  return undefined;
}

/**
 * レート制限リトライハンドラーの設定
 */
export interface RateLimitConfig {
  /**
   * 最大リトライ回数
   * @default 3
   */
  maxRetries?: number;

  /**
   * デフォルトの待機秒数（retry-afterがない場合）
   * @default 60
   */
  defaultWaitSeconds?: number;

  /**
   * 最大待機秒数（retry-afterがこの値を超える場合に制限）
   * @default 300
   */
  maxWaitSeconds?: number;
}

/**
 * レート制限ハンドリングの実行オプション
 */
export interface RateLimitExecuteOptions {
  /**
   * リトライ時のコールバック関数
   *
   * @param error - 発生したRateLimitError
   * @param attempt - 現在のリトライ回数（1から開始）
   * @param waitSeconds - 待機する秒数
   */
  onRetry?: (error: RateLimitError, attempt: number, waitSeconds: number) => void;
}

/**
 * レート制限対応リトライハンドラー
 *
 * Claude APIのレート制限エラーを検出し、
 * retry-afterヘッダーに基づいて適切に待機・リトライします。
 */
export class RateLimitRetryHandler {
  private readonly maxRetries: number;
  private readonly defaultWaitSeconds: number;
  private readonly maxWaitSeconds: number;

  /**
   * コンストラクタ
   *
   * @param config - ハンドラー設定
   */
  constructor(config: RateLimitConfig = {}) {
    this.maxRetries = config.maxRetries ?? 3;
    this.defaultWaitSeconds = config.defaultWaitSeconds ?? 60;
    this.maxWaitSeconds = config.maxWaitSeconds ?? 300;
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): Required<RateLimitConfig> {
    return {
      maxRetries: this.maxRetries,
      defaultWaitSeconds: this.defaultWaitSeconds,
      maxWaitSeconds: this.maxWaitSeconds,
    };
  }

  /**
   * レート制限ハンドリング付きで関数を実行
   *
   * レート制限エラーが発生した場合、retry-afterに基づいて待機し、
   * 最大リトライ回数までリトライします。
   *
   * @param fn - 実行する非同期関数
   * @param options - 実行オプション
   * @returns 関数の実行結果
   * @throws {RateLimitError} 最大リトライ回数を超えた場合
   */
  async executeWithRateLimitHandling<T>(
    fn: () => Promise<T>,
    options: RateLimitExecuteOptions = {}
  ): Promise<T> {
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        // レート制限エラーでない場合はそのままスロー
        if (!isRateLimitError(error)) {
          throw error;
        }

        attempt++;

        // 最大リトライ回数を超えた場合
        if (attempt > this.maxRetries) {
          const retryAfter = extractRetryAfter(error);
          throw new RateLimitError(
            `Rate limit exceeded after ${this.maxRetries} retries`,
            retryAfter,
            error instanceof Error ? error : undefined
          );
        }

        // 待機時間を決定
        const retryAfter = extractRetryAfter(error);
        const waitSeconds = Math.min(
          retryAfter ?? this.defaultWaitSeconds,
          this.maxWaitSeconds
        );

        // RateLimitErrorを作成
        const rateLimitError = new RateLimitError(
          'Rate limit exceeded, retrying...',
          waitSeconds,
          error instanceof Error ? error : undefined
        );

        // コールバックを実行
        if (options.onRetry) {
          options.onRetry(rateLimitError, attempt, waitSeconds);
        }

        // 待機
        await this.sleep(waitSeconds * 1000);
      }
    }

    // ここには到達しないはず
    throw new RateLimitError(`Rate limit exceeded after ${this.maxRetries} retries`);
  }

  /**
   * 関数をレート制限ハンドリングでラップ
   *
   * @param fn - ラップする非同期関数
   * @param options - 実行オプション
   * @returns ラップされた関数
   */
  wrapWithRateLimitHandling<T>(
    fn: () => Promise<T>,
    options: RateLimitExecuteOptions = {}
  ): () => Promise<T> {
    return () => this.executeWithRateLimitHandling(fn, options);
  }

  /**
   * 指定時間待機する
   *
   * @param ms - 待機時間（ミリ秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
