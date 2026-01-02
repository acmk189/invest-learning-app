/**
 * 用語重複チェック機能エクスポート
 * Task 10: 用語重複チェック
 *
 * 過去30日以内に配信した用語を除外するための
 * 重複チェック機能を提供します。
 *
 * Requirements: 4.3, 5.5, 8.5
 */

// Task 10.1: 配信済み用語取得機能
export {
  TermHistoryRepository,
  TermHistoryEntry,
  TermHistoryQuery,
} from './termHistoryRepository';

// Task 10.2: 重複判定ロジック
export {
  DuplicateChecker,
  DuplicateCheckResult,
  DuplicateCheckMode,
  DuplicateCheckerOptions,
  DuplicateCheckerStats,
  normalizeTermName,
} from './duplicateChecker';

// Task 10.3: 再生成リクエスト機能
export {
  TermRegenerator,
  TermRegenerationResult,
  RegenerationOptions,
  TermRegeneratorConfig,
  RegenerationHistoryEntry,
} from './termRegenerator';

// Task 10.4: 重複チェックエラーハンドリング
export {
  DuplicateCheckError,
  DuplicateCheckErrorType,
  DuplicateCheckErrorHandler,
  isDuplicateCheckError,
  HistoryFetchErrorContext,
  DuplicateCheckErrorContext,
  RegenerationErrorContext,
  MaxRegenerationExceededContext,
} from './duplicateCheckErrorHandler';
