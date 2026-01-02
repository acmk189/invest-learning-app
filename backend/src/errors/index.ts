/**
 * エラーハンドリング共通機能のエクスポート
 * Task 2.2: エラーハンドリング共通機能実装
 * Task 3.4: レート制限ハンドリング追加
 * Task 3.5: AIサービスエラーハンドリング追加
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

// Task 3.4: レート制限ハンドリング
export {
  RateLimitError,
  isRateLimitError,
  extractRetryAfter,
  RateLimitRetryHandler,
  RateLimitConfig,
  RateLimitExecuteOptions,
} from '../services/rateLimitHandler';

// Task 3.5: AIサービスエラーハンドリング
export {
  AIServiceError,
  AIServiceTimeoutError,
  AIServiceUnavailableError,
  isAIServiceError,
  isTimeoutError,
  AIServiceErrorHandler,
  AIServiceErrorHandlerConfig,
} from '../services/aiServiceErrorHandler';
