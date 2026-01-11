/**
 * エラータイプ定義
 * Task 2.2: エラーハンドリング共通機能実装
 * Task 12: Firebase依存の完全削除
 */

/**
 * エラーの種類を分類するEnum
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * エラーの重要度を分類するEnum
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * アプリケーション共通のエラー基底クラス
 */
export abstract class AppError extends Error {
  public readonly type: ErrorType;
  public readonly timestamp: number;
  public severity: ErrorSeverity;
  public retryable: boolean;
  public originalError?: Error;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.severity = severity;
    this.retryable = retryable;
    this.timestamp = Date.now();
    this.originalError = originalError;

    // スタックトレースをキャプチャ
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ネットワークエラー
 * ネットワーク接続の問題を表すエラー
 */
export class NetworkError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, ErrorType.NETWORK, ErrorSeverity.HIGH, true, originalError);
  }
}

/**
 * APIエラー
 * 外部APIとの通信に関するエラー
 */
export class ApiError extends AppError {
  public readonly apiName: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    apiName: string,
    originalError?: Error,
    statusCode?: number
  ) {
    super(message, ErrorType.API, ErrorSeverity.HIGH, true, originalError);
    this.apiName = apiName;
    this.statusCode = statusCode;
  }
}

/**
 * データベースエラー
 * データベース操作に関するエラー(Supabase/PostgreSQL)
 */
export class DatabaseError extends AppError {
  public readonly operation?: string;

  constructor(
    message: string,
    originalError?: Error,
    operation?: 'read' | 'write' | 'delete' | 'query'
  ) {
    super(message, ErrorType.DATABASE, ErrorSeverity.CRITICAL, true, originalError);
    this.operation = operation;
  }
}

/**
 * @deprecated FirestoreError is deprecated. Use DatabaseError instead.
 */
export const FirestoreError = DatabaseError;
