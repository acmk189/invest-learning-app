/**
 * ニュース最終失敗時詳細ログ保存
 *
 * Task 9.4: ニュース最終失敗時詳細ログ保存
 *
 * 最終的な失敗時にFirestore error_logsコレクションに詳細ログを保存する
 * リトライを全て使い果たした場合などの重大なエラーを記録
 *
 * Requirements:
 * - 8.5 (外部API障害時エラーハンドリング+ログ)
 *
 * @see https://firebase.google.com/docs/firestore - Firestore参考
 */

import { getFirestore } from '../../../config/firebase';
import { BatchErrorInfo } from './newsBatchService';
import { NewsBatchRetryResult } from './newsBatchRetryHandler';

/**
 * バッチエラーログの設定
 */
export interface BatchErrorLogConfig {
  /**
   * エラーログを保存するコレクション名
   * @default 'error_logs'
   */
  collectionName?: string;
}

/**
 * エラーログエントリ
 *
 * Firestoreに保存するエラーログの構造
 */
export interface BatchErrorLogEntry {
  /** バッチタイプ（'news' or 'terms'） */
  batchType: 'news' | 'terms';
  /** 処理日付（YYYY-MM-DD） */
  date: string;
  /** 試行回数 */
  attemptCount: number;
  /** リトライ回数 */
  totalRetries: number;
  /** 総処理時間（ミリ秒） */
  totalProcessingTimeMs: number;
  /** 部分成功フラグ */
  partialSuccess: boolean;
  /** 例外発生フラグ */
  exceptionOccurred: boolean;
  /** エラー情報の配列 */
  errors: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
  /** ログ保存時のタイムスタンプ */
  timestamp: string;
  /** 追加のコンテキスト情報（任意） */
  context?: Record<string, unknown>;
}

/**
 * デフォルト設定
 */
const DEFAULT_COLLECTION_NAME = 'error_logs';

/**
 * ニュースバッチエラーロガー
 *
 * バッチ処理の最終失敗時に詳細なエラーログをFirestoreに保存する
 * 後で障害分析や運用監視に利用できる
 *
 * @example
 * const logger = new NewsBatchErrorLogger();
 *
 * // リトライ後も失敗した場合にログを保存
 * if (!retryResult.success && !retryResult.partialSuccess) {
 *   await logger.logFinalFailure(retryResult, { environment: 'production' });
 * }
 */
export class NewsBatchErrorLogger {
  private readonly collectionName: string;

  /**
   * コンストラクタ
   *
   * @param config - 設定オプション
   */
  constructor(config: BatchErrorLogConfig = {}) {
    this.collectionName = config.collectionName ?? DEFAULT_COLLECTION_NAME;
  }

  /**
   * 最終失敗時のエラーログを保存
   *
   * リトライを全て使い果たした後の最終失敗時にFirestoreにログを保存する
   *
   * @param retryResult - リトライ結果
   * @param context - 追加のコンテキスト情報（任意）
   */
  async logFinalFailure(
    retryResult: NewsBatchRetryResult,
    context?: Record<string, unknown>
  ): Promise<void> {
    try {
      const db = getFirestore();

      // エラー情報を変換
      const errors = (retryResult.finalResult.errors || []).map((error) => ({
        type: error.type,
        message: error.message,
        timestamp: error.timestamp.toISOString(),
      }));

      // ログエントリを作成
      const logEntry: BatchErrorLogEntry = {
        batchType: 'news',
        date: retryResult.finalResult.date,
        attemptCount: retryResult.attemptCount,
        totalRetries: retryResult.totalRetries,
        totalProcessingTimeMs: retryResult.totalProcessingTimeMs,
        partialSuccess: retryResult.partialSuccess,
        exceptionOccurred: retryResult.exceptionOccurred,
        errors,
        timestamp: new Date().toISOString(),
        context,
      };

      // Firestoreに保存
      await db.collection(this.collectionName).add(logEntry);

      console.log(
        '[NewsBatchErrorLogger]',
        `Error log saved for date ${retryResult.finalResult.date}. ` +
          `Attempts: ${retryResult.attemptCount}, Errors: ${errors.length}`
      );
    } catch (error) {
      // ログ保存の失敗は握りつぶし、コンソールに出力のみ
      console.error(
        '[NewsBatchErrorLogger]',
        `Failed to save error log: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * エラーログのサマリーを出力
   *
   * @param retryResult - リトライ結果
   */
  logSummaryToConsole(retryResult: NewsBatchRetryResult): void {
    const { finalResult, attemptCount, totalRetries, totalProcessingTimeMs } =
      retryResult;
    const errorCount = finalResult.errors?.length || 0;

    console.error(
      '[NewsBatchErrorLogger]',
      '=== Final Failure Summary ==='
    );
    console.error(
      '[NewsBatchErrorLogger]',
      `Date: ${finalResult.date}`
    );
    console.error(
      '[NewsBatchErrorLogger]',
      `Attempts: ${attemptCount} (Retries: ${totalRetries})`
    );
    console.error(
      '[NewsBatchErrorLogger]',
      `Total Time: ${totalProcessingTimeMs}ms`
    );
    console.error(
      '[NewsBatchErrorLogger]',
      `Error Count: ${errorCount}`
    );

    if (finalResult.errors && finalResult.errors.length > 0) {
      console.error(
        '[NewsBatchErrorLogger]',
        'Errors:'
      );
      for (const error of finalResult.errors) {
        console.error(
          '[NewsBatchErrorLogger]',
          `  - [${error.type}] ${error.message}`
        );
      }
    }

    console.error(
      '[NewsBatchErrorLogger]',
      '=== End of Summary ==='
    );
  }
}
