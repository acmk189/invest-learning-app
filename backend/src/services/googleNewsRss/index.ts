/**
 * Google News RSS統合モジュール
 *
 * Task 7: Google News RSS統合
 * Requirements: 1.3 (Google News RSSから日本の投資・経済ニュース取得)
 *
 * このモジュールはGoogle News RSSフィードから日本のビジネス・経済ニュースを
 * 取得する機能を提供します。
 *
 * @example
 * import { RssParser, JapanNewsFetcher } from './services/googleNewsRss';
 *
 * const parser = new RssParser();
 * const fetcher = new JapanNewsFetcher(parser);
 * const news = await fetcher.fetchJapanNews();
 */

// 型定義
export type {
  GoogleNewsRssItem,
  GoogleNewsRssFeed,
  RssParserConfig,
} from './types';
export { DEFAULT_RSS_PARSER_CONFIG } from './types';

// RSSパーサー
export { RssParser } from './rssParser';

// 日本ニュース取得
export {
  JapanNewsFetcher,
  RssError,
  RssTimeoutError,
  RssNetworkError,
} from './japanNewsFetcher';
export type { JapanNewsFetcherConfig } from './japanNewsFetcher';
