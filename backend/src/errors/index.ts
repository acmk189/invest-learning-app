/**
 * エラーハンドリング共通機能のエクスポート
 * Task 2.2: エラーハンドリング共通機能実装
 */

export {
  AppError,
  NetworkError,
  ApiError,
  FirestoreError,
  ErrorType,
  ErrorSeverity,
} from './types';

export { ErrorLogger } from './error-logger';
export { RetryHandler, RetryConfig } from './retry-handler';
export {
  USER_ERROR_MESSAGES,
  DETAILED_ERROR_MESSAGES,
  getUserErrorMessage,
  getDetailedErrorMessage,
} from './error-messages';
