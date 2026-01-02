/**
 * ニュースサービスモジュール
 *
 * ニュース要約関連の機能をエクスポートします。
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
