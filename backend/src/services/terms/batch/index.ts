/**
 * 用語バッチモジュール
 *
 * 用語バッチ処理に関する機能を提供します。
 *
 * Task 11: 用語バッチ処理
 * Task 12: 用語バッチエラー処理
 */

// バッチサービス本体
export {
  TermsBatchService,
  TermsBatchError,
  type TermsBatchServiceConfig,
  type TermsBatchResult,
  type BatchErrorInfo,
} from './termsBatchService';

// リトライハンドラー（Task 12.1）
export {
  TermsBatchRetryHandler,
  type TermsBatchRetryConfig,
  type TermsBatchRetryResult,
} from './termsBatchRetryHandler';

// ステップ別エラーログ（Task 12.2）
export {
  TermsBatchStepLogger,
  TermsBatchStep,
  type StepLogEntry,
  type StepLogSummary,
} from './termsBatchStepLogger';

// 部分成功ハンドラー（Task 12.3）
export {
  TermsPartialSuccessHandler,
  TermsPartialSuccessType,
  type TermsPartialSuccessResult,
  type TermsPartialSuccessNotification,
} from './termsBatchPartialSuccessHandler';

// 最終失敗時エラーログ（Task 12.4）
export {
  TermsBatchErrorLogger,
  type TermsBatchErrorLogConfig,
  type TermsBatchErrorLogEntry,
} from './termsBatchErrorLogger';
