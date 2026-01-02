/**
 * ニュースバッチステップ別エラーログ
 *
 * Task 9.2: ニュースステップ別エラーログ記録
 *
 * バッチ処理の各ステップでのエラーを詳細に記録する
 * ニュース取得、AI処理、Firestore保存の各段階でエラーを追跡可能にする
 *
 * Requirements:
 * - 8.5 (外部API障害時エラーハンドリング+ログ)
 * - 11.3 (エラー発生時詳細ログ)
 *
 * @see https://firebase.google.com/docs/firestore - Firestore参考
 */

import { BatchErrorInfo } from './newsBatchService';

/**
 * バッチ処理のステップを定義するEnum
 *
 * バッチ処理の各段階を識別するために使用
 */
export enum BatchStep {
  /** 世界ニュース取得（NewsAPI） */
  WORLD_NEWS_FETCH = 'world-news-fetch',
  /** 日本ニュース取得（Google News RSS） */
  JAPAN_NEWS_FETCH = 'japan-news-fetch',
  /** 世界ニュースAI要約処理 */
  WORLD_NEWS_SUMMARY = 'world-news-summary',
  /** 日本ニュースAI要約処理 */
  JAPAN_NEWS_SUMMARY = 'japan-news-summary',
  /** Firestoreへの保存 */
  FIRESTORE_SAVE = 'firestore-save',
  /** メタデータ更新 */
  METADATA_UPDATE = 'metadata-update',
  /** 不明なステップ */
  UNKNOWN = 'unknown',
}

/**
 * ステップログエントリ
 *
 * 各ステップの実行結果を記録するデータ構造
 */
export interface StepLogEntry {
  /** ステップ種別 */
  step: BatchStep;
  /** 成功フラグ */
  success: boolean;
  /** エラー情報（失敗時） */
  error?: BatchErrorInfo;
  /** タイムスタンプ */
  timestamp: Date;
  /** 追加メタデータ（任意） */
  metadata?: Record<string, unknown>;
}

/**
 * ステップログサマリー
 *
 * 全ステップの実行結果を集計したサマリー情報
 */
export interface StepLogSummary {
  /** 実行されたステップの総数 */
  totalSteps: number;
  /** 成功したステップ数 */
  successCount: number;
  /** 失敗したステップ数 */
  errorCount: number;
  /** 失敗したステップ一覧 */
  failedSteps: BatchStep[];
  /** 成功したステップ一覧 */
  successfulSteps: BatchStep[];
}

/**
 * エラータイプからステップへのマッピング
 *
 * BatchErrorInfoのtypeプロパティをBatchStepにマッピングする
 */
const ERROR_TYPE_TO_STEP: Record<string, BatchStep> = {
  'world-news-fetch': BatchStep.WORLD_NEWS_FETCH,
  'japan-news-fetch': BatchStep.JAPAN_NEWS_FETCH,
  'world-news-summary': BatchStep.WORLD_NEWS_SUMMARY,
  'japan-news-summary': BatchStep.JAPAN_NEWS_SUMMARY,
  'firestore-save': BatchStep.FIRESTORE_SAVE,
  'metadata-update': BatchStep.METADATA_UPDATE,
};

/**
 * ニュースバッチステップロガー
 *
 * バッチ処理の各ステップでの成功・失敗を記録し、
 * 後で分析や障害対応に利用できるログを提供する
 *
 * @example
 * const logger = new NewsBatchStepLogger();
 *
 * // 成功を記録
 * logger.logStepSuccess(BatchStep.WORLD_NEWS_FETCH, { articleCount: 10 });
 *
 * // エラーを記録
 * logger.logStepError(BatchStep.JAPAN_NEWS_FETCH, {
 *   type: 'japan-news-fetch',
 *   message: 'RSS取得失敗',
 *   timestamp: new Date()
 * });
 *
 * // サマリーを取得
 * const summary = logger.getSummary();
 */
export class NewsBatchStepLogger {
  /** ログエントリの配列 */
  private logs: StepLogEntry[] = [];

  /**
   * ステップの成功を記録
   *
   * @param step - 成功したステップ
   * @param metadata - 追加情報（任意）
   */
  logStepSuccess(step: BatchStep, metadata?: Record<string, unknown>): void {
    const entry: StepLogEntry = {
      step,
      success: true,
      timestamp: new Date(),
      metadata,
    };

    this.logs.push(entry);

    console.log(
      '[NewsBatchStepLogger]',
      `Step "${step}" completed successfully${metadata ? ` (${JSON.stringify(metadata)})` : ''}`
    );
  }

  /**
   * ステップのエラーを記録
   *
   * @param step - 失敗したステップ
   * @param error - エラー情報
   */
  logStepError(step: BatchStep, error: BatchErrorInfo): void {
    const entry: StepLogEntry = {
      step,
      success: false,
      error,
      timestamp: new Date(),
    };

    this.logs.push(entry);

    console.error(
      '[NewsBatchStepLogger]',
      `Step "${step}" failed: ${error.message}`
    );
  }

  /**
   * BatchErrorInfo配列からログを一括登録
   *
   * バッチ処理結果のエラー配列をログに変換して登録する
   *
   * @param errors - エラー情報の配列
   */
  logErrorsFromBatchResult(errors: BatchErrorInfo[]): void {
    for (const error of errors) {
      const step = this.mapErrorTypeToStep(error.type);
      this.logStepError(step, error);
    }
  }

  /**
   * 全てのログを取得
   *
   * @returns ログエントリの配列
   */
  getLogs(): StepLogEntry[] {
    return [...this.logs];
  }

  /**
   * 特定のステップのログを取得
   *
   * @param step - フィルタするステップ
   * @returns フィルタされたログエントリの配列
   */
  getLogsByStep(step: BatchStep): StepLogEntry[] {
    return this.logs.filter((log) => log.step === step);
  }

  /**
   * エラーログのみを取得
   *
   * @returns エラーログエントリの配列
   */
  getErrorLogs(): StepLogEntry[] {
    return this.logs.filter((log) => !log.success);
  }

  /**
   * ログサマリーを取得
   *
   * @returns サマリー情報
   */
  getSummary(): StepLogSummary {
    const successLogs = this.logs.filter((log) => log.success);
    const errorLogs = this.logs.filter((log) => !log.success);

    return {
      totalSteps: this.logs.length,
      successCount: successLogs.length,
      errorCount: errorLogs.length,
      failedSteps: errorLogs.map((log) => log.step),
      successfulSteps: successLogs.map((log) => log.step),
    };
  }

  /**
   * ログをクリア
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * エラータイプをステップにマッピング
   *
   * @param errorType - エラータイプ文字列
   * @returns 対応するBatchStep
   */
  private mapErrorTypeToStep(errorType: string): BatchStep {
    return ERROR_TYPE_TO_STEP[errorType] ?? BatchStep.UNKNOWN;
  }
}
