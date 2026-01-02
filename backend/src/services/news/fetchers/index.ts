/**
 * ニュースフェッチャーモジュール
 *
 * 世界・日本のニュースを外部ソースから取得する機能を提供します。
 *
 * - NewsAPI: 世界のビジネスニュース取得
 * - Google News RSS: 日本の経済ニュース取得
 */

// NewsAPI クライアント
export {
  NewsApiClient,
  NewsApiKeyError,
  getNewsApiKey,
  validateNewsApiKey,
} from './newsApiClient';
export type { NewsApiClientConfig, NewsApiClientInfo } from './newsApiClient';

// 世界ニュース取得
export {
  WorldNewsFetcher,
  NewsApiError,
  NewsApiRateLimitError,
  NewsApiTimeoutError,
} from './worldNewsFetcher';

// NewsAPI 型定義
export type {
  NewsApiSource,
  NewsApiArticle,
  TopHeadlinesParams,
  TopHeadlinesResponse,
  NewsApiErrorResponse,
  RequestUsage,
} from './newsApiTypes';

// RSS パーサー
export { RssParser } from './rssParser';

// 日本ニュース取得
export {
  JapanNewsFetcher,
  RssError,
  RssTimeoutError,
  RssNetworkError,
} from './japanNewsFetcher';
export type { JapanNewsFetcherConfig } from './japanNewsFetcher';

// Google News RSS 型定義
export type {
  GoogleNewsRssItem,
  GoogleNewsRssFeed,
  RssParserConfig,
} from './rssTypes';
export { DEFAULT_RSS_PARSER_CONFIG } from './rssTypes';
