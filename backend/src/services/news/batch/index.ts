/**
 * ニュースバッチモジュール
 *
 * ニュースバッチ処理に関する機能を提供します。
 *
 * Task 8: ニュースバッチ処理
 * Task 9: ニュースバッチエラー処理
 */

export {
  NewsBatchService,
  NewsBatchError,
  type NewsBatchServiceConfig,
  type NewsBatchResult,
  type BatchErrorInfo,
  type NewsSummaryData,
} from './newsBatchService';

// Task 9.1: ニュースバッチリトライロジック
export {
  NewsBatchRetryHandler,
  type NewsBatchRetryConfig,
  type NewsBatchRetryResult,
} from './newsBatchRetryHandler';

// Task 9.2: ニュースステップ別エラーログ記録
export {
  NewsBatchStepLogger,
  BatchStep,
  type StepLogEntry,
  type StepLogSummary,
} from './newsBatchStepLogger';

// Task 9.3: ニュース部分成功検出・ハンドリング
export {
  PartialSuccessHandler,
  PartialSuccessType,
  type PartialSuccessResult,
  type PartialSuccessNotification,
} from './newsBatchPartialSuccessHandler';

// Task 9.4: ニュース最終失敗時詳細ログ保存
export {
  NewsBatchErrorLogger,
  type BatchErrorLogEntry,
  type BatchErrorLogConfig,
} from './newsBatchErrorLogger';
