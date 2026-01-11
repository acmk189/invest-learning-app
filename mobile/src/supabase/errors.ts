/**
 * Supabase エラーハンドリング
 * Task 10.3: Supabaseエラー型対応
 *
 * Supabase固有のエラーをアプリ共通のエラー型に変換し、
 * ユーザーフレンドリーなメッセージを提供します。
 *
 * Requirements:
 * - 9: フロントエンドRepository移行
 * - 7.5: エラー時リトライオプション提供
 *
 * @see https://supabase.com/docs/reference/javascript/handling-errors
 */

import { SupabaseQueryError } from './queries';

/**
 * Supabaseエラーコード
 *
 * FirestoreErrorCodeと同じインターフェースを維持し、
 * Repository層での置換を容易にする
 */
export type SupabaseErrorCode =
  | 'CONNECTION_FAILED'
  | 'TIMEOUT'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'CANCELLED'
  | 'UNKNOWN';

/**
 * Supabaseエラー
 *
 * カスタムエラークラスでエラーコードとリトライ可能性を含む。
 * FirestoreErrorと同じインターフェースを維持。
 */
export class SupabaseError extends Error {
  /** エラーコード */
  readonly code: SupabaseErrorCode;
  /** 元のエラー */
  readonly originalError?: Error;
  /** リトライ可能かどうか */
  readonly retryable: boolean;

  constructor(
    code: SupabaseErrorCode,
    message: string,
    originalError?: Error,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'SupabaseError';
    this.code = code;
    this.originalError = originalError;
    this.retryable = retryable;

    // Errorのプロトタイプチェーンを維持
    Object.setPrototypeOf(this, SupabaseError.prototype);
  }
}

/**
 * ユーザー向けエラーメッセージ (日本語)
 * FirestoreのERROR_MESSAGESと同じ内容を維持
 *
 * Requirement 7.5: 適切なエラーメッセージを表示
 */
export const ERROR_MESSAGES: Record<SupabaseErrorCode, string> = {
  CONNECTION_FAILED: 'サーバーに接続できませんでした。インターネット接続を確認してください。',
  TIMEOUT: '接続がタイムアウトしました。しばらくしてからもう一度お試しください。',
  NOT_FOUND: 'データが見つかりませんでした。',
  PERMISSION_DENIED: 'データへのアクセス権限がありません。',
  UNAVAILABLE: 'サービスが一時的に利用できません。しばらくしてからもう一度お試しください。',
  CANCELLED: '操作がキャンセルされました。',
  UNKNOWN: '予期しないエラーが発生しました。しばらくしてからもう一度お試しください。',
};

/**
 * リトライ可能なエラーコードのリスト
 */
const RETRYABLE_ERROR_CODES: SupabaseErrorCode[] = [
  'CONNECTION_FAILED',
  'TIMEOUT',
  'UNAVAILABLE',
];

/**
 * Supabase/PostgreSQLエラーコードをアプリのエラーコードにマッピング
 *
 * @see https://postgrest.org/en/stable/errors.html
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 * @param pgErrorCode - PostgreSQL/PostgRESTエラーコード
 * @returns アプリのエラーコード
 */
function mapSupabaseErrorCode(pgErrorCode: string): SupabaseErrorCode {
  // PostgreSQL/PostgRESTエラーコードからアプリのエラーコードへのマッピング
  const errorCodeMapping: Record<string, SupabaseErrorCode> = {
    // PostgRESTエラー
    PGRST116: 'NOT_FOUND', // "Requested range not satisfiable" or "No rows found"
    PGRST000: 'CONNECTION_FAILED', // Connection error

    // PostgreSQLエラー (Class 28: Invalid Authorization)
    '28000': 'PERMISSION_DENIED', // Invalid authorization specification
    '28P01': 'PERMISSION_DENIED', // Invalid password

    // PostgreSQLエラー (Class 42: Syntax Error or Access Rule Violation)
    '42501': 'PERMISSION_DENIED', // Insufficient privilege
    '42P01': 'NOT_FOUND', // Undefined table

    // PostgreSQLエラー (Class 57: Operator Intervention)
    '57014': 'TIMEOUT', // Query canceled
    '57P01': 'UNAVAILABLE', // Admin shutdown
    '57P02': 'UNAVAILABLE', // Crash shutdown
    '57P03': 'UNAVAILABLE', // Cannot connect now

    // PostgreSQLエラー (Class 08: Connection Exception)
    '08000': 'CONNECTION_FAILED', // Connection exception
    '08003': 'CONNECTION_FAILED', // Connection does not exist
    '08006': 'CONNECTION_FAILED', // Connection failure

    // PostgreSQLエラー (Class 53: Insufficient Resources)
    '53300': 'UNAVAILABLE', // Too many connections
  };

  return errorCodeMapping[pgErrorCode] || 'UNKNOWN';
}

/**
 * エラーをSupabaseErrorに変換する
 *
 * @param error - 元のエラー
 * @returns SupabaseError
 */
export function toSupabaseError(error: unknown): SupabaseError {
  // 既にSupabaseErrorの場合はそのまま返す
  if (error instanceof SupabaseError) {
    return error;
  }

  // SupabaseQueryErrorの場合
  if (error instanceof SupabaseQueryError) {
    const code = mapSupabaseErrorCode(error.code);
    const retryable = RETRYABLE_ERROR_CODES.includes(code);
    return new SupabaseError(code, ERROR_MESSAGES[code], error, retryable);
  }

  // Errorオブジェクトの場合
  if (error instanceof Error) {
    // タイムアウトエラーの検出
    if (
      error.message.includes('timeout') ||
      error.message.includes('Timeout') ||
      error.message.includes('TIMEOUT')
    ) {
      return new SupabaseError('TIMEOUT', ERROR_MESSAGES.TIMEOUT, error, true);
    }

    // ネットワークエラーの検出
    if (
      error.message.includes('network') ||
      error.message.includes('Network') ||
      error.message.includes('NETWORK') ||
      error.message.includes('connection') ||
      error.message.includes('Connection') ||
      error.message.includes('fetch')
    ) {
      return new SupabaseError(
        'CONNECTION_FAILED',
        ERROR_MESSAGES.CONNECTION_FAILED,
        error,
        true
      );
    }

    // その他のエラー
    return new SupabaseError('UNKNOWN', ERROR_MESSAGES.UNKNOWN, error, false);
  }

  // 不明なエラー
  return new SupabaseError(
    'UNKNOWN',
    ERROR_MESSAGES.UNKNOWN,
    new Error(String(error)),
    false
  );
}

/**
 * ユーザー向けエラーメッセージを取得する
 *
 * @param error - SupabaseError
 * @returns ユーザー向けエラーメッセージ
 */
export function getUserFriendlyMessage(error: SupabaseError): string {
  return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN;
}

/**
 * オフライン状態かどうかを判定する
 *
 * @param error - SupabaseError
 * @returns オフライン状態の可能性がある場合はtrue
 */
export function isOfflineError(error: SupabaseError): boolean {
  return error.code === 'CONNECTION_FAILED' || error.code === 'UNAVAILABLE';
}

/**
 * リトライ可能なエラーかどうかを判定する
 *
 * @param error - SupabaseError
 * @returns リトライ可能な場合はtrue
 */
export function isRetryableError(error: SupabaseError): boolean {
  return error.retryable;
}

/**
 * エラーをログに記録する
 *
 * @param error - SupabaseError
 * @param context - エラーが発生したコンテキスト(例: 'fetchNews', 'fetchTerms')
 */
export function logSupabaseError(error: SupabaseError, context: string): void {
  console.error(`[Supabase Error] ${context}:`, {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    originalError: error.originalError?.message,
  });
}
