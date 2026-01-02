/**
 * 用語生成サービスモジュール
 * Task 5: バックエンド - 用語生成機能
 *
 * 投資・金融用語の生成に関する機能を提供します。
 *
 * Requirements:
 * - 4.1: 1日3つ投資用語生成
 * - 4.2: 各用語に約500文字の解説生成
 * - 4.4: 初級〜上級の難易度混在
 * - 1.7: バッチ失敗時エラーログ+リトライ
 */

// プロンプト生成（Task 5.1, 5.2）
export {
  buildTermGenerationPrompt,
  TERM_GENERATION_CONFIG,
  DIFFICULTY_DESCRIPTIONS,
  type DifficultyLevel,
  type TermGenerationPromptOptions,
} from './termGenerationPrompt';

// レスポンスパース・検証（Task 5.3, 5.4）
export {
  parseTermResponse,
  validateTermDescription,
  type TermParseResult,
  type TermValidationResult,
} from './termResponseParser';

// 用語生成サービス（Task 5.5）
export {
  TermGenerationService,
  TermGenerationError,
  type TermGenerationResult,
  type TermGenerationServiceConfig,
  type GenerateTermOptions,
} from './termGenerationService';

// 重複チェック機能（Task 10）
export {
  // Task 10.1: 配信済み用語取得
  TermHistoryRepository,
  type TermHistoryEntry,
  type TermHistoryQuery,
  // Task 10.2: 重複判定
  DuplicateChecker,
  DuplicateCheckMode,
  normalizeTermName,
  type DuplicateCheckResult,
  type DuplicateCheckerOptions,
  type DuplicateCheckerStats,
  // Task 10.3: 再生成リクエスト
  TermRegenerator,
  type TermRegenerationResult,
  type RegenerationOptions,
  type TermRegeneratorConfig,
  type RegenerationHistoryEntry,
  // Task 10.4: エラーハンドリング
  DuplicateCheckError,
  DuplicateCheckErrorType,
  DuplicateCheckErrorHandler,
  isDuplicateCheckError,
  type HistoryFetchErrorContext,
  type DuplicateCheckErrorContext,
  type RegenerationErrorContext,
  type MaxRegenerationExceededContext,
} from './duplicate';
