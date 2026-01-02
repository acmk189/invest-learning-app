/**
 * AIサービスエラーハンドラー
 * Task 3.5: AIサービスエラーハンドリング
 *
 * Claude API（Anthropic）のエラーを適切にハンドリングし、
 * タイムアウト、API障害、その他のエラーを分類・ログ記録します。
 *
 * Requirements: 8.5 (外部API障害時エラーハンドリング+ログ), 11.3 (詳細ログ記録)
 *
 * @see https://docs.anthropic.com/en/api/errors
 */

import { AppError, ErrorType, ErrorSeverity } from '../errors/types';
import { ErrorLogger } from '../errors/error-logger';

/**
 * AIサービスエラー
 *
 * Claude APIとの通信で発生する一般的なエラー。
 * 操作名（operation）を保持し、どの処理で失敗したかを追跡できます。
 */
export class AIServiceError extends AppError {
  /**
   * 操作名（例: 'news-summary', 'term-generation'）
   */
  public readonly operation?: string;

  constructor(message: string, operation?: string, originalError?: Error) {
    super(message, ErrorType.API, ErrorSeverity.HIGH, true, originalError);
    this.name = 'AIServiceError';
    this.operation = operation;
  }
}

/**
 * AIサービスタイムアウトエラー
 *
 * API呼び出しがタイムアウトした場合にスローされるエラー。
 * タイムアウト時間を保持します。
 */
export class AIServiceTimeoutError extends AIServiceError {
  /**
   * タイムアウト時間（ミリ秒）
   */
  public readonly timeoutMs: number;

  constructor(
    message: string,
    timeoutMs: number,
    operation?: string,
    originalError?: Error
  ) {
    super(message, operation, originalError);
    this.name = 'AIServiceTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * AIサービス利用不可エラー
 *
 * APIサービスが利用できない場合（503、500、502、504など）にスローされるエラー。
 * HTTPステータスコードを保持します。
 */
export class AIServiceUnavailableError extends AIServiceError {
  /**
   * HTTPステータスコード
   */
  public readonly statusCode: number;

  constructor(
    message: string,
    statusCode: number,
    operation?: string,
    originalError?: Error
  ) {
    super(message, operation, originalError);
    this.name = 'AIServiceUnavailableError';
    this.statusCode = statusCode;
    // サービス利用不可はHIGH severity
    this.severity = ErrorSeverity.HIGH;
  }
}

/**
 * AIサービスエラーかどうかを判定する
 *
 * @param error - 判定するエラーオブジェクト
 * @returns AIServiceError（またはそのサブクラス）の場合true
 */
export function isAIServiceError(error: unknown): error is AIServiceError {
  return error instanceof AIServiceError;
}

/**
 * タイムアウトエラーかどうかを判定する
 *
 * Anthropic SDKのタイムアウトエラーやメッセージに"timeout"を含むエラーを検出します。
 *
 * @param error - 判定するエラーオブジェクト
 * @returns タイムアウトエラーの場合true
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof AIServiceTimeoutError) {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as Record<string, unknown>;

  // Anthropic SDKのAPIConnectionTimeoutErrorをチェック
  if (err.name === 'APIConnectionTimeoutError') {
    return true;
  }

  // メッセージに"timeout"または"timed out"を含むかチェック
  if (typeof err.message === 'string') {
    const message = err.message.toLowerCase();
    if (message.includes('timeout') || message.includes('timed out')) {
      return true;
    }
  }

  return false;
}

/**
 * サーバーエラー（5xx）かどうかを判定する
 *
 * @param error - 判定するエラーオブジェクト
 * @returns 5xxエラーの場合、ステータスコードを返す。そうでない場合undefined
 */
function getServerErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const err = error as Record<string, unknown>;

  // statusプロパティをチェック
  if (typeof err.status === 'number' && err.status >= 500 && err.status < 600) {
    return err.status;
  }

  // statusCodeプロパティをチェック
  if (
    typeof err.statusCode === 'number' &&
    err.statusCode >= 500 &&
    err.statusCode < 600
  ) {
    return err.statusCode;
  }

  return undefined;
}

/**
 * AIサービスエラーハンドラーの設定
 */
export interface AIServiceErrorHandlerConfig {
  /**
   * デフォルトのタイムアウト時間（ミリ秒）
   * @default 30000
   */
  defaultTimeoutMs?: number;

  /**
   * エラーをログに記録するかどうか
   * @default true
   */
  logErrors?: boolean;

  /**
   * エラーロガーインスタンス
   * 未設定の場合はコンソールに出力
   */
  errorLogger?: ErrorLogger;
}

/**
 * AIサービスエラーハンドラー
 *
 * Claude APIで発生するエラーを適切に分類し、
 * ログ記録機能を提供します。
 */
export class AIServiceErrorHandler {
  private readonly defaultTimeoutMs: number;
  private readonly logErrors: boolean;
  private readonly errorLogger?: ErrorLogger;

  /**
   * コンストラクタ
   *
   * @param config - ハンドラー設定
   */
  constructor(config: AIServiceErrorHandlerConfig = {}) {
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 30000;
    this.logErrors = config.logErrors ?? true;
    this.errorLogger = config.errorLogger;
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): Required<Omit<AIServiceErrorHandlerConfig, 'errorLogger'>> & {
    errorLogger?: ErrorLogger;
  } {
    return {
      defaultTimeoutMs: this.defaultTimeoutMs,
      logErrors: this.logErrors,
      errorLogger: this.errorLogger,
    };
  }

  /**
   * エラーを適切なAIServiceErrorに変換する
   *
   * @param error - 変換するエラー
   * @param operation - 操作名
   * @returns 変換されたAIServiceError
   */
  handleError(error: unknown, operation: string): AIServiceError {
    // 既にAIServiceErrorの場合はそのまま返す
    if (error instanceof AIServiceError) {
      return error;
    }

    const originalError = error instanceof Error ? error : undefined;

    // サーバーエラー（5xx）を先にチェック
    // 504 Gateway Timeout はサーバーエラーとして扱う
    const serverErrorStatus = getServerErrorStatus(error);
    if (serverErrorStatus !== undefined) {
      return new AIServiceUnavailableError(
        originalError?.message || `Service unavailable (${serverErrorStatus})`,
        serverErrorStatus,
        operation,
        originalError
      );
    }

    // タイムアウトエラーの場合（クライアント側のタイムアウト）
    if (isTimeoutError(error)) {
      return new AIServiceTimeoutError(
        originalError?.message || 'Request timed out',
        this.defaultTimeoutMs,
        operation,
        originalError
      );
    }

    // その他のエラー
    return new AIServiceError(
      originalError?.message || 'AI service error occurred',
      operation,
      originalError
    );
  }

  /**
   * エラーをログに記録する
   *
   * @param error - 記録するエラー
   * @param context - 追加のコンテキスト情報
   */
  async logError(
    error: AIServiceError,
    context?: Record<string, unknown>
  ): Promise<void> {
    const logContext = {
      service: 'claude-api',
      operation: error.operation,
      ...context,
    };

    if (this.errorLogger) {
      await this.errorLogger.logError(error, logContext);
    } else {
      // ErrorLoggerが未設定の場合はコンソールに出力
      console.error('[AIServiceError]', {
        name: error.name,
        message: error.message,
        ...logContext,
        stack: error.stack,
      });
    }
  }

  /**
   * エラーを変換してログに記録する
   *
   * @param error - 処理するエラー
   * @param operation - 操作名
   * @param context - 追加のコンテキスト情報
   * @returns 変換されたAIServiceError
   */
  async handleAndLog(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>
  ): Promise<AIServiceError> {
    const aiError = this.handleError(error, operation);

    if (this.logErrors) {
      await this.logError(aiError, context);
    }

    return aiError;
  }
}
