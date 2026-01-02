/**
 * ニュース要約モジュール
 *
 * ニュース記事のAI要約関連の機能を提供します。
 */

// プロンプト生成
export {
  NewsArticle,
  SUMMARY_CONFIG,
  buildEnglishNewsSummaryPrompt,
  buildJapaneseNewsSummaryPrompt,
} from './newsSummaryPrompt';

// レスポンスパーサー
export {
  SummaryParseResult,
  SummaryValidationResult,
  parseSummaryResponse,
  validateSummaryLength,
} from './summaryResponseParser';

// 要約サービス
export {
  NewsSummaryService,
  NewsSummaryServiceConfig,
  NewsSummaryError,
  SummaryResult,
} from './newsSummaryService';
