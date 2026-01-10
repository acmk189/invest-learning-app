/**
 * ニュースバッチリトライハンドラー
 *
 * Task 9.1: ニュースバッチリトライロジック
 *
 * バッチ処理失敗時に最大3回リトライする機能を提供する
 * 指数バックオフを使用してリトライ間隔を調整する
 *
 * Requirements:
 * - 8.3 (失敗時3回リトライ)
 *
 * @see https://docs.anthropic.com/claude/docs/errors - Anthropic APIエラー参考
 */

import { NewsBatchResult } from './newsBatchService';

/**
 * リトライ設定
 *
 * リトライ動作をカスタマイズするための設定オブジェクト
 */
export interface NewsBatchRetryConfig {
  /**
   * 最大リトライ回数
   * @default 3
   */
  maxRetries?: number;

  /**
   * 基本遅延時間（ミリ秒）
   * 指数バックオフの基準となる時間
   * @default 1000
   */
  baseDelayMs?: number;

  /**
   * 最大遅延時間（ミリ秒）
   * 指数バックオフで計算された遅延がこの値を超えないよう制限
   * @default 30000
   */
  maxDelayMs?: number;

  /**
   * リトライ時に呼び出されるコールバック関数
   * ログ記録や監視に使用
   *
   * @param attempt - 現在のリトライ回数（1始まり）
   * @param delayMs - 次のリトライまでの待機時間
   * @param result - 失敗したバッチ結果
   */
  onRetry?: (attempt: number, delayMs: number, result: NewsBatchResult) => void;
}

/**
 * リトライ実行結果
 *
 * リトライ処理全体の結果を表す
 */
export interface NewsBatchRetryResult {
  /** 最終的な成功/失敗 */
  success: boolean;

  /** 部分的な成功（片方のニュースだけ成功） */
  partialSuccess: boolean;

  /** 最終的なバッチ処理結果 */
  finalResult: NewsBatchResult;

  /** 総試行回数（初回 + リトライ回数） */
  attemptCount: number;

  /** リトライ回数（最大3） */
  totalRetries: number;

  /** 総処理時間（リトライ待機時間を含む） */
  totalProcessingTimeMs: number;

  /** 例外が発生したかどうか */
  exceptionOccurred: boolean;
}

/**
 * デフォルト値
 */
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30000;

/**
 * ニュースバッチリトライハンドラー
 *
 * バッチ処理の失敗時にリトライを管理するクラス
 * 指数バックオフアルゴリズムを使用して、連続的なリトライによるシステム負荷を軽減する
 *
 * @example
 * const handler = new NewsBatchRetryHandler({
 *   maxRetries: 3,
 *   onRetry: (attempt, delay, result) => {
 *     console.log(`リトライ ${attempt}回目, ${delay}ms後に再試行`);
 *   }
 * });
 *
 * const result = await handler.executeWithRetry(() => batchService.execute());
 */
export class NewsBatchRetryHandler {
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly onRetry?: (
    attempt: number,
    delayMs: number,
    result: NewsBatchResult
  ) => void;

  /**
   * コンストラクタ
   *
   * @param config - リトライ設定
   */
  constructor(config: NewsBatchRetryConfig = {}) {
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.onRetry = config.onRetry;
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): Required<Omit<NewsBatchRetryConfig, 'onRetry'>> {
    return {
      maxRetries: this.maxRetries,
      baseDelayMs: this.baseDelayMs,
      maxDelayMs: this.maxDelayMs,
    };
  }

  /**
   * リトライ付きでバッチ処理を実行
   *
   * バッチ処理が失敗した場合、最大maxRetries回までリトライする
   * 部分成功（片方のニュースのみ成功）の場合はリトライしない
   *
   * @param executeFn - バッチ処理を実行する関数
   * @returns リトライ結果
   */
  async executeWithRetry(
    executeFn: () => Promise<NewsBatchResult>
  ): Promise<NewsBatchRetryResult> {
    const startTime = Date.now();
    let attemptCount = 0;
    let lastResult: NewsBatchResult | null = null;
    let exceptionOccurred = false;

    while (attemptCount <= this.maxRetries) {
      attemptCount++;

      try {
        lastResult = await executeFn();

        // 成功または部分成功の場合はリトライしない
        if (lastResult.success || lastResult.partialSuccess) {
          console.log(
            `[NewsBatchRetryHandler] Batch completed on attempt ${attemptCount}. ` +
              `Success: ${lastResult.success}, PartialSuccess: ${lastResult.partialSuccess}`
          );
          break;
        }

        // 完全失敗の場合、リトライ上限に達していなければリトライ
        if (attemptCount <= this.maxRetries) {
          const delay = this.calculateDelay(attemptCount);

          console.log(
            `[NewsBatchRetryHandler] Attempt ${attemptCount} failed. ` +
              `Retrying in ${delay}ms...`
          );

          // リトライコールバックを呼び出し
          if (this.onRetry) {
            this.onRetry(attemptCount, delay, lastResult);
          }

          // 次のリトライまで待機
          await this.sleep(delay);
        }
      } catch (error) {
        exceptionOccurred = true;

        // エラーを結果に変換
        lastResult = this.createErrorResult(error);

        // リトライ上限に達していなければリトライ
        if (attemptCount <= this.maxRetries) {
          const delay = this.calculateDelay(attemptCount);

          console.log(
            `[NewsBatchRetryHandler] Attempt ${attemptCount} threw exception: ` +
              `${error instanceof Error ? error.message : 'Unknown error'}. ` +
              `Retrying in ${delay}ms...`
          );

          // リトライコールバックを呼び出し
          if (this.onRetry) {
            this.onRetry(attemptCount, delay, lastResult);
          }

          // 次のリトライまで待機
          await this.sleep(delay);
        }
      }
    }

    // 結果がない場合（通常は発生しない）
    if (!lastResult) {
      lastResult = this.createEmptyResult();
    }

    const totalProcessingTimeMs = Date.now() - startTime;

    console.log(
      `[NewsBatchRetryHandler] Retry handler completed. ` +
        `Attempts: ${attemptCount}, Retries: ${attemptCount - 1}, ` +
        `Total time: ${totalProcessingTimeMs}ms`
    );

    return {
      success: lastResult.success,
      partialSuccess: lastResult.partialSuccess,
      finalResult: lastResult,
      attemptCount,
      totalRetries: attemptCount - 1,
      totalProcessingTimeMs,
      exceptionOccurred,
    };
  }

  /**
   * 指数バックオフを使用して遅延時間を計算
   *
   * 計算式: baseDelay * 2^(attempt-1)
   * 例: baseDelay=1000の場合、1回目=1000ms, 2回目=2000ms, 3回目=4000ms
   *
   * @param attempt - 現在のリトライ回数（1始まり）
   * @returns 遅延時間（ミリ秒）
   */
  calculateDelay(attempt: number): number {
    // 指数バックオフ: baseDelay * 2^(attempt-1)
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt - 1);
    // 最大遅延時間を超えないよう制限
    return Math.min(exponentialDelay, this.maxDelayMs);
  }

  /**
   * 指定時間待機する
   *
   * @param ms - 待機時間（ミリ秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 例外からエラー結果を作成
   *
   * @param error - 発生した例外
   * @returns バッチ結果
   */
  private createErrorResult(error: unknown): NewsBatchResult {
    return {
      success: false,
      partialSuccess: false,
      databaseSaved: false,
      metadataUpdated: false,
      processingTimeMs: 0,
      date: new Date().toISOString().split('T')[0],
      errors: [
        {
          type: 'exception',
          message: error instanceof Error ? error.message : 'Unknown exception',
          timestamp: new Date(),
        },
      ],
    };
  }

  /**
   * 空の結果を作成（フォールバック用）
   *
   * @returns 空のバッチ結果
   */
  private createEmptyResult(): NewsBatchResult {
    return {
      success: false,
      partialSuccess: false,
      databaseSaved: false,
      metadataUpdated: false,
      processingTimeMs: 0,
      date: new Date().toISOString().split('T')[0],
      errors: [
        {
          type: 'unknown',
          message: 'No result available',
          timestamp: new Date(),
        },
      ],
    };
  }
}
