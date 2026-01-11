/**
 * News Feature モジュールエクスポート
 * Task 17: News Repository
 * Task 18: News ViewModel
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
  type CacheValidator,
  type CacheSetter,
} from './news-repository';

export {
  useNewsViewModel,
  type NewsState,
  type NewsViewModelResult,
} from './news-viewmodel';

export { NewsScreen } from './news-screen';
