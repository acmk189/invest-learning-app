/**
 * Firestore エラーハンドリング
 * Task 14.4: Firestoreエラーハンドリングを実装する
 *
 * 接続失敗、タイムアウト時のエラーハンドリングを提供します。
 *
 * Requirements:
 * - 7.5: ネットワークエラー発生時、適切なエラーメッセージを表示しリトライオプションを提供する
 * - 8.5: 外部API障害時エラーハンドリング+ログ
 */

/**
 * Firestoreエラーコード
 */
export type FirestoreErrorCode =
  | 'CONNECTION_FAILED'
  | 'TIMEOUT'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'CANCELLED'
  | 'UNKNOWN';

/**
 * Firestoreエラー
 * カスタムエラークラスでエラーコードとリトライ可能性を含む
 */
export class FirestoreError extends Error {
  /** エラーコード */
  readonly code: FirestoreErrorCode;
  /** 元のエラー */
  readonly originalError?: Error;
  /** リトライ可能かどうか */
  readonly retryable: boolean;

  constructor(
    code: FirestoreErrorCode,
    message: string,
    originalError?: Error,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'FirestoreError';
    this.code = code;
    this.originalError = originalError;
    this.retryable = retryable;

    // Errorのプロトタイプチェーンを維持
    Object.setPrototypeOf(this, FirestoreError.prototype);
  }
}

/**
 * ユーザー向けエラーメッセージ（日本語）
 * Requirement 7.5: 適切なエラーメッセージを表示
 */
export const ERROR_MESSAGES: Record<FirestoreErrorCode, string> = {
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
const RETRYABLE_ERROR_CODES: FirestoreErrorCode[] = [
  'CONNECTION_FAILED',
  'TIMEOUT',
  'UNAVAILABLE',
];

/**
 * Firebase Firestoreのエラーコードをアプリのエラーコードにマッピング
 *
 * @see https://firebase.google.com/docs/reference/js/firestore_.firestoreerrorcode
 * @param firebaseErrorCode - Firebaseのエラーコード
 * @returns アプリのエラーコード
 */
function mapFirebaseErrorCode(firebaseErrorCode: string): FirestoreErrorCode {
  // Firebase Firestoreのエラーコードからアプリのエラーコードへのマッピング
  const errorCodeMapping: Record<string, FirestoreErrorCode> = {
    // 接続関連
    'firestore/unavailable': 'UNAVAILABLE',
    unavailable: 'UNAVAILABLE',
    'firestore/deadline-exceeded': 'TIMEOUT',
    'deadline-exceeded': 'TIMEOUT',
    // 権限関連
    'firestore/permission-denied': 'PERMISSION_DENIED',
    'permission-denied': 'PERMISSION_DENIED',
    // データ関連
    'firestore/not-found': 'NOT_FOUND',
    'not-found': 'NOT_FOUND',
    // キャンセル
    'firestore/cancelled': 'CANCELLED',
    cancelled: 'CANCELLED',
    // ネットワーク関連
    'firestore/network-request-failed': 'CONNECTION_FAILED',
    'network-request-failed': 'CONNECTION_FAILED',
  };

  return errorCodeMapping[firebaseErrorCode] || 'UNKNOWN';
}

/**
 * エラーをFirestoreErrorに変換する
 *
 * @param error - 元のエラー
 * @returns FirestoreError
 */
export function toFirestoreError(error: unknown): FirestoreError {
  // 既にFirestoreErrorの場合はそのまま返す
  if (error instanceof FirestoreError) {
    return error;
  }

  // Errorオブジェクトの場合
  if (error instanceof Error) {
    // Firebaseエラーの場合（codeプロパティを持つ）
    const firebaseError = error as Error & { code?: string };
    if (firebaseError.code) {
      const code = mapFirebaseErrorCode(firebaseError.code);
      const retryable = RETRYABLE_ERROR_CODES.includes(code);
      return new FirestoreError(
        code,
        ERROR_MESSAGES[code],
        error,
        retryable
      );
    }

    // タイムアウトエラーの検出
    if (
      error.message.includes('timeout') ||
      error.message.includes('Timeout') ||
      error.message.includes('TIMEOUT')
    ) {
      return new FirestoreError(
        'TIMEOUT',
        ERROR_MESSAGES.TIMEOUT,
        error,
        true
      );
    }

    // ネットワークエラーの検出
    if (
      error.message.includes('network') ||
      error.message.includes('Network') ||
      error.message.includes('NETWORK') ||
      error.message.includes('connection') ||
      error.message.includes('Connection')
    ) {
      return new FirestoreError(
        'CONNECTION_FAILED',
        ERROR_MESSAGES.CONNECTION_FAILED,
        error,
        true
      );
    }

    // その他のエラー
    return new FirestoreError('UNKNOWN', ERROR_MESSAGES.UNKNOWN, error, false);
  }

  // 不明なエラー
  return new FirestoreError(
    'UNKNOWN',
    ERROR_MESSAGES.UNKNOWN,
    new Error(String(error)),
    false
  );
}

/**
 * ユーザー向けエラーメッセージを取得する
 *
 * @param error - FirestoreError
 * @returns ユーザー向けエラーメッセージ
 */
export function getUserFriendlyMessage(error: FirestoreError): string {
  return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN;
}

/**
 * エラーをログに記録する
 *
 * @param error - FirestoreError
 * @param context - エラーが発生したコンテキスト（例: 'fetchNews', 'fetchTerms'）
 */
export function logFirestoreError(error: FirestoreError, context: string): void {
  console.error(`[Firestore Error] ${context}:`, {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    originalError: error.originalError?.message,
  });
}

/**
 * オフライン状態かどうかを判定する
 *
 * @param error - FirestoreError
 * @returns オフライン状態の可能性がある場合はtrue
 */
export function isOfflineError(error: FirestoreError): boolean {
  return error.code === 'CONNECTION_FAILED' || error.code === 'UNAVAILABLE';
}
