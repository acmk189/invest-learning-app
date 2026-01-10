/**
 * ニュースサービスモジュール
 *
 * ニュースの取得と要約に関する機能を提供します。
 *
 * ## 構成
 * - fetchers: 外部ソースからのニュース取得(NewsAPI, Google News RSS)
 * - summarization: AI によるニュース要約処理
 */

// Fetchers - ニュース取得
export {
  // NewsAPI
  NewsApiClient,
  NewsApiKeyError,
  getNewsApiKey,
  validateNewsApiKey,
  WorldNewsFetcher,
  NewsApiError,
  NewsApiRateLimitError,
  NewsApiTimeoutError,
  // Google News RSS
  RssParser,
  JapanNewsFetcher,
  RssError,
  RssTimeoutError,
  RssNetworkError,
  DEFAULT_RSS_PARSER_CONFIG,
} from './fetchers';

export type {
  // NewsAPI types
  NewsApiClientConfig,
  NewsApiClientInfo,
  NewsApiSource,
  NewsApiArticle,
  TopHeadlinesParams,
  TopHeadlinesResponse,
  NewsApiErrorResponse,
  RequestUsage,
  // Google News RSS types
  JapanNewsFetcherConfig,
  GoogleNewsRssItem,
  GoogleNewsRssFeed,
  RssParserConfig,
} from './fetchers';

// Summarization - ニュース要約
export {
  NewsArticle,
  SUMMARY_CONFIG,
  buildEnglishNewsSummaryPrompt,
  buildJapaneseNewsSummaryPrompt,
  parseSummaryResponse,
  validateSummaryLength,
  NewsSummaryService,
  NewsSummaryError,
} from './summarization';

export type {
  SummaryParseResult,
  SummaryValidationResult,
  NewsSummaryServiceConfig,
  SummaryResult,
} from './summarization';

// Batch - ニュースバッチ処理
export { NewsBatchService, NewsBatchError } from './batch';

export type {
  NewsBatchServiceConfig,
  NewsBatchResult,
  BatchErrorInfo,
  NewsSummaryData,
} from './batch';
