/**
 * NewsAPI統合モジュール
 *
 * Task 6: バックエンド - NewsAPI統合
 *
 * NewsAPI v2を使用して世界のビジネスニュースを取得する機能を提供します。
 *
 * @see https://newsapi.org/docs/get-started - NewsAPI ドキュメント
 */

// クライアント
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

// 型定義
export type {
  NewsApiSource,
  NewsApiArticle,
  TopHeadlinesParams,
  TopHeadlinesResponse,
  NewsApiErrorResponse,
  RequestUsage,
} from './types';
