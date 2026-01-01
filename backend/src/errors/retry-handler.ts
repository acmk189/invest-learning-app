/**
 * リトライハンドラー実装
 * Task 2.2: エラーハンドリング共通機能実装
 */

import { AppError } from './types';

/**
 * リトライ設定
 */
export interface RetryConfig {
  /** 最大リトライ回数 */
  maxRetries?: number;
  /** 基本遅延時間（ミリ秒） */
  baseDelay?: number;
  /** 最大遅延時間（ミリ秒） */
  maxDelay?: number;
  /** リトライ時のコールバック */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * リトライロジックを提供するクラス
 */
export class RetryHandler {
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly onRetry?: (error: Error, attempt: number, delay: number) => void;

  constructor(config: RetryConfig = {}) {
    this.maxRetries = config.maxRetries ?? 3;
    this.baseDelay = config.baseDelay ?? 1000;
    this.maxDelay = config.maxDelay ?? 30000;
    this.onRetry = config.onRetry;
  }

  /**
   * 指数バックオフを使用してリトライを実行する
   * @param fn - 実行する関数
   * @returns 関数の実行結果
   */
  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // リトライ可能かチェック
        if (!this.shouldRetry(lastError, attempt)) {
          throw lastError;
        }

        // 最大リトライ回数を超えた場合
        if (attempt > this.maxRetries) {
          throw lastError;
        }

        // 遅延時間を計算
        const delay = this.calculateDelay(attempt);

        // リトライコールバックを実行
        if (this.onRetry) {
          this.onRetry(lastError, attempt, delay);
        }

        // 指数バックオフで待機
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * エラーがリトライ可能かどうかを判定する
   * @param error - チェックするエラー
   * @param attempt - 現在のリトライ回数
   * @returns リトライ可能な場合true
   */
  shouldRetry(error: Error, attempt: number): boolean {
    // 最大リトライ回数を超えた場合はリトライしない
    if (attempt > this.maxRetries) {
      return false;
    }

    // AppErrorの場合、retryableプロパティをチェック
    if (error instanceof AppError) {
      return error.retryable;
    }

    // その他のエラーはデフォルトでリトライ可能
    return true;
  }

  /**
   * 指数バックオフを使用して遅延時間を計算する
   * @param attempt - 現在のリトライ回数
   * @returns 遅延時間（ミリ秒）
   */
  calculateDelay(attempt: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(exponentialDelay, this.maxDelay);
  }

  /**
   * 指定時間待機する
   * @param ms - 待機時間（ミリ秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
