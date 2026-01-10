/**
 * Terms Feature エクスポート
 * Task 21: Terms Repository
 * Task 22: Terms ViewModel
 *
 * Terms機能の公開APIを提供します。
 */

export {
  TermsRepository,
  createTermsRepository,
  type TermsSource,
  type TermsError,
  type TermsResult,
  type TermsRepositoryConfig,
  type FirestoreFetcher,
  type CacheValidator,
  type CacheSetter,
} from './terms-repository';

export {
  useTermsViewModel,
  type TermsState,
  type TermsViewModelResult,
} from './terms-viewmodel';
