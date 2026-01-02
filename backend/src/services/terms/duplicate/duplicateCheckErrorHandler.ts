/**
 * 重複チェックエラーハンドリング
 * Task 10.4: 重複チェックエラーハンドリング
 *
 * 重複チェック処理中に発生するエラーを適切に
 * ハンドリングし、ログを記録する機能を提供します。
 *
 * Requirements: 8.5 (外部API障害時エラーハンドリング+ログ)
 *
 * エラータイプ:
 * - HISTORY_FETCH_FAILED: 配信済み用語履歴の取得失敗
 * - DUPLICATE_CHECK_FAILED: 重複チェック処理の失敗
 * - REGENERATION_FAILED: 用語再生成の失敗
 * - MAX_REGENERATION_EXCEEDED: 最大再生成回数超過
 */

import { AppError, ErrorType, ErrorSeverity } from '../../../errors/types';
import { ErrorLogger } from '../../../errors/error-logger';

/**
 * 重複チェックエラータイプ
 *
 * 重複チェック処理で発生する可能性のあるエラーを分類します。
 */
export enum DuplicateCheckErrorType {
  /**
   * 配信済み用語履歴の取得失敗
   *
   * Firestoreからterms_historyの取得に失敗した場合
   */
  HISTORY_FETCH_FAILED = 'HISTORY_FETCH_FAILED',

  /**
   * 重複チェック処理の失敗
   *
   * 重複判定ロジックでエラーが発生した場合
   */
  DUPLICATE_CHECK_FAILED = 'DUPLICATE_CHECK_FAILED',

  /**
   * 用語再生成の失敗
   *
   * AIサービスへの再生成リクエストが失敗した場合
   */
  REGENERATION_FAILED = 'REGENERATION_FAILED',

  /**
   * 最大再生成回数超過
   *
   * 指定された最大再生成回数を超えた場合
   */
  MAX_REGENERATION_EXCEEDED = 'MAX_REGENERATION_EXCEEDED',
}

/**
 * 重複チェックエラー
 *
 * 重複チェック処理中に発生したエラーを表現します。
 * AppErrorを継承し、重複チェック固有の情報を追加します。
 */
export class DuplicateCheckError extends AppError {
  /**
   * 重複チェックエラータイプ
   */
  public readonly duplicateCheckErrorType: DuplicateCheckErrorType;

  /**
   * 追加コンテキスト情報
   */
  public readonly context?: Record<string, unknown>;

  /**
   * コンストラクタ
   *
   * @param message - エラーメッセージ
   * @param duplicateCheckErrorType - エラータイプ
   * @param originalError - 元のエラー（オプション）
   * @param context - 追加コンテキスト（オプション）
   */
  constructor(
    message: string,
    duplicateCheckErrorType: DuplicateCheckErrorType,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    // エラータイプに応じた重大度を設定
    const severity = duplicateCheckErrorType === DuplicateCheckErrorType.MAX_REGENERATION_EXCEEDED
      ? ErrorSeverity.CRITICAL
      : ErrorSeverity.HIGH;

    super(message, ErrorType.FIRESTORE, severity, true, originalError);
    this.name = 'DuplicateCheckError';
    this.duplicateCheckErrorType = duplicateCheckErrorType;
    this.context = context;
  }
}

/**
 * DuplicateCheckErrorかどうかを判定
 *
 * @param error - 判定対象
 * @returns DuplicateCheckErrorの場合true
 */
export function isDuplicateCheckError(
  error: unknown
): error is DuplicateCheckError {
  return error instanceof DuplicateCheckError;
}

/**
 * 履歴取得エラーコンテキスト
 */
export interface HistoryFetchErrorContext {
  /** 取得日数 */
  days?: number;
  /** 難易度フィルター */
  difficulty?: string;
}

/**
 * 重複チェックエラーコンテキスト
 */
export interface DuplicateCheckErrorContext {
  /** チェック対象の用語名 */
  termName?: string;
  /** 配信済み用語数 */
  deliveredTermCount?: number;
}

/**
 * 再生成エラーコンテキスト
 */
export interface RegenerationErrorContext {
  /** 現在の試行回数 */
  attempt?: number;
  /** 最大試行回数 */
  maxAttempts?: number;
  /** 難易度 */
  difficulty?: string;
}

/**
 * 最大再生成回数超過コンテキスト
 */
export interface MaxRegenerationExceededContext {
  /** 最大試行回数 */
  maxAttempts?: number;
  /** 重複した用語リスト */
  duplicatedTerms?: string[];
}

/**
 * 重複チェックエラーハンドラー
 *
 * 重複チェック処理中のエラーをハンドリングし、
 * Firestoreにログを記録します。
 *
 * @example
 * const errorLogger = new ErrorLogger(firestore);
 * const handler = new DuplicateCheckErrorHandler(errorLogger);
 *
 * try {
 *   await fetchTermHistory();
 * } catch (error) {
 *   const handledError = await handler.handleHistoryFetchError(error, { days: 30 });
 *   throw handledError;
 * }
 */
export class DuplicateCheckErrorHandler {
  /**
   * エラーロガー
   */
  private readonly errorLogger: ErrorLogger;

  /**
   * コンストラクタ
   *
   * @param errorLogger - エラーロガー
   */
  constructor(errorLogger: ErrorLogger) {
    this.errorLogger = errorLogger;
  }

  /**
   * 履歴取得エラーをハンドリング
   *
   * @param error - 発生したエラー
   * @param context - エラーコンテキスト
   * @returns DuplicateCheckError
   */
  async handleHistoryFetchError(
    error: Error,
    context: HistoryFetchErrorContext
  ): Promise<DuplicateCheckError> {
    const contextRecord: Record<string, unknown> = { ...context };
    const duplicateCheckError = new DuplicateCheckError(
      `配信済み用語履歴の取得に失敗しました: ${error.message}`,
      DuplicateCheckErrorType.HISTORY_FETCH_FAILED,
      error,
      contextRecord
    );

    await this.logError(duplicateCheckError, contextRecord);
    return duplicateCheckError;
  }

  /**
   * 重複チェックエラーをハンドリング
   *
   * @param error - 発生したエラー
   * @param context - エラーコンテキスト
   * @returns DuplicateCheckError
   */
  async handleDuplicateCheckError(
    error: Error,
    context: DuplicateCheckErrorContext
  ): Promise<DuplicateCheckError> {
    const contextRecord: Record<string, unknown> = { ...context };
    const duplicateCheckError = new DuplicateCheckError(
      `重複チェック処理に失敗しました: ${error.message}`,
      DuplicateCheckErrorType.DUPLICATE_CHECK_FAILED,
      error,
      contextRecord
    );

    await this.logError(duplicateCheckError, contextRecord);
    return duplicateCheckError;
  }

  /**
   * 再生成エラーをハンドリング
   *
   * @param error - 発生したエラー
   * @param context - エラーコンテキスト
   * @returns DuplicateCheckError
   */
  async handleRegenerationError(
    error: Error,
    context: RegenerationErrorContext
  ): Promise<DuplicateCheckError> {
    const contextRecord: Record<string, unknown> = { ...context };
    const duplicateCheckError = new DuplicateCheckError(
      `用語の再生成に失敗しました: ${error.message}`,
      DuplicateCheckErrorType.REGENERATION_FAILED,
      error,
      contextRecord
    );

    await this.logError(duplicateCheckError, contextRecord);
    return duplicateCheckError;
  }

  /**
   * 最大再生成回数超過をハンドリング
   *
   * @param context - エラーコンテキスト
   * @returns DuplicateCheckError
   */
  async handleMaxRegenerationExceeded(
    context: MaxRegenerationExceededContext
  ): Promise<DuplicateCheckError> {
    const contextRecord: Record<string, unknown> = { ...context };
    const duplicateCheckError = new DuplicateCheckError(
      `最大再生成回数(${context.maxAttempts})を超えました。ユニークな用語を生成できませんでした。`,
      DuplicateCheckErrorType.MAX_REGENERATION_EXCEEDED,
      undefined,
      contextRecord
    );

    await this.logError(duplicateCheckError, contextRecord);
    return duplicateCheckError;
  }

  /**
   * カスタムエラーを作成
   *
   * @param message - エラーメッセージ
   * @param errorType - エラータイプ
   * @param originalError - 元のエラー
   * @param context - コンテキスト
   * @returns DuplicateCheckError
   */
  createError(
    message: string,
    errorType: DuplicateCheckErrorType,
    originalError?: Error,
    context?: Record<string, unknown>
  ): DuplicateCheckError {
    return new DuplicateCheckError(message, errorType, originalError, context);
  }

  /**
   * エラーをログに記録
   *
   * @param error - 記録するエラー
   * @param context - コンテキスト情報
   */
  private async logError(
    error: DuplicateCheckError,
    context: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.errorLogger.logError(error, context);
    } catch (loggingError) {
      // ログ記録の失敗は無視（コンソールには出力）
      console.error(
        '[DuplicateCheckErrorHandler] エラーログの記録に失敗しました:',
        loggingError
      );
    }
  }
}
