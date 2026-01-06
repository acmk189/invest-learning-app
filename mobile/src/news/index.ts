/**
 * News Feature モジュールエクスポート
 * Task 17: News Repository
 *
 * News Feature の公開APIを定義します。
 */

export {
  NewsRepository,
  createNewsRepository,
  type NewsResult,
  type NewsError,
  type NewsSource,
  type NewsRepositoryConfig,
  type FirestoreFetcher,
  type CacheValidator,
  type CacheSetter,
} from './news-repository';
