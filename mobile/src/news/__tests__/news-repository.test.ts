/**
 * News Repository テスト
 * Task 17: News Repository
 * Task 11: オフライン対応強化 - Supabase対応
 *
 * TDDに従い、News Repositoryのテストを先に記述します。
 *
 * Requirements:
 * - 2.1: アプリ起動時当日ニュース表示
 * - 2.4: 1日中同じニュース表示
 * - 2.5: オフライン時キャッシュ済みニュース表示
 * - 7.5: エラー時リトライオプション提供
 * - 10: オフライン対応強化
 */

import { NewsRepository, NewsResult, NewsRepositoryConfig } from '../news-repository';
import { NewsData, SupabaseQueryResult } from '../../supabase/types';
import { CacheValidationResult } from '../../cache/cache-manager';
import { SupabaseError } from '../../supabase/errors';
import * as networkUtils from '../../utils/network';

// モックデータ
const mockNewsData: NewsData = {
  date: '2024-01-15',
  worldNews: {
    title: '世界ニュースのタイトル',
    summary: '世界ニュースの要約(約2000文字)...',
    updatedAt: '2024-01-15T08:00:00.000Z',
  },
  japanNews: {
    title: '日本ニュースのタイトル',
    summary: '日本ニュースの要約(約2000文字)...',
    updatedAt: '2024-01-15T08:00:00.000Z',
  },
  createdAt: '2024-01-15T08:00:00.000Z',
  updatedAt: '2024-01-15T08:00:00.000Z',
};

// Supabaseクエリのモック
const createMockSupabaseFetcher = (
  result: SupabaseQueryResult<NewsData>
): (() => Promise<SupabaseQueryResult<NewsData>>) => {
  return jest.fn().mockResolvedValue(result);
};

// キャッシュの検証結果モック
const createMockCacheValidator = (
  result: CacheValidationResult<NewsData>
): ((type: 'news' | 'terms', dateStr: string) => Promise<CacheValidationResult<NewsData>>) => {
  return jest.fn().mockResolvedValue(result);
};

// キャッシュ保存のモック
const createMockCacheSetter = (): ((
  type: 'news' | 'terms',
  dateStr: string,
  data: NewsData
) => Promise<void>) => {
  return jest.fn().mockResolvedValue(undefined);
};

describe('NewsRepository', () => {
  describe('getTodayNews', () => {
    it('キャッシュが有効な場合、キャッシュからデータを返す', async () => {
      // Arrange
      const mockCacheValidator = createMockCacheValidator({
        data: mockNewsData,
        isValid: true,
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockNewsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: NewsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new NewsRepository(config);

      // Act
      const result = await repository.getTodayNews();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNewsData);
      expect(result.source).toBe('cache');
      expect(mockCacheValidator).toHaveBeenCalled();
      expect(mockSupabaseFetcher).not.toHaveBeenCalled();
    });

    it('キャッシュが無効な場合、Supabaseからデータを取得してキャッシュに保存する', async () => {
      // Arrange
      const mockCacheValidator = createMockCacheValidator({
        data: null,
        isValid: false,
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockNewsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: NewsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new NewsRepository(config);

      // Act
      const result = await repository.getTodayNews();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNewsData);
      expect(result.source).toBe('supabase');
      expect(mockCacheValidator).toHaveBeenCalled();
      expect(mockSupabaseFetcher).toHaveBeenCalled();
      expect(mockCacheSetter).toHaveBeenCalled();
    });

    it('Supabaseにデータが存在しない場合、nullを返す', async () => {
      // Arrange
      const mockCacheValidator = createMockCacheValidator({
        data: null,
        isValid: false,
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: null,
        exists: false,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: NewsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new NewsRepository(config);

      // Act
      const result = await repository.getTodayNews();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.source).toBe('supabase');
      expect(mockCacheSetter).not.toHaveBeenCalled();
    });

    it('Supabaseでエラーが発生した場合、エラー結果を返す', async () => {
      // Arrange
      const mockError = new SupabaseError(
        'CONNECTION_FAILED',
        'サーバーに接続できませんでした。',
        undefined,
        true
      );
      const mockCacheValidator = createMockCacheValidator({
        data: null,
        isValid: false,
      });
      const mockSupabaseFetcher = jest.fn().mockRejectedValue(mockError);
      const mockCacheSetter = createMockCacheSetter();

      const config: NewsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new NewsRepository(config);

      // Act
      const result = await repository.getTodayNews();

      // Assert
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('CONNECTION_FAILED');
      expect(result.error?.retryable).toBe(true);
    });

    it('キャッシュ検証でエラーが発生してもSupabaseから取得を試みる', async () => {
      // Arrange
      const mockCacheValidator = jest.fn().mockRejectedValue(new Error('Cache error'));
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockNewsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: NewsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new NewsRepository(config);

      // Act
      const result = await repository.getTodayNews();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNewsData);
      expect(result.source).toBe('supabase');
    });

    it('キャッシュ保存でエラーが発生しても結果は成功として返す', async () => {
      // Arrange
      const mockCacheValidator = createMockCacheValidator({
        data: null,
        isValid: false,
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockNewsData,
        exists: true,
      });
      const mockCacheSetter = jest.fn().mockRejectedValue(new Error('Cache write error'));

      const config: NewsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new NewsRepository(config);

      // Act
      const result = await repository.getTodayNews();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNewsData);
    });
  });

  describe('NewsResult 型', () => {
    it('成功結果は正しい形式を持つ', () => {
      const successResult: NewsResult = {
        success: true,
        data: mockNewsData,
        source: 'cache',
      };

      expect(successResult.success).toBe(true);
      expect(successResult.data).toBeDefined();
      expect(successResult.error).toBeUndefined();
    });

    it('失敗結果は正しい形式を持つ', () => {
      const failureResult: NewsResult = {
        success: false,
        data: null,
        source: 'supabase',
        error: {
          code: 'CONNECTION_FAILED',
          message: 'サーバーに接続できませんでした。',
          retryable: true,
        },
      };

      expect(failureResult.success).toBe(false);
      expect(failureResult.data).toBeNull();
      expect(failureResult.error).toBeDefined();
      expect(failureResult.error?.retryable).toBe(true);
    });
  });

  describe('Offline Fallback (Requirement 2.5, 10)', () => {
    beforeEach(() => {
      // ネットワーク状態をリセット
      networkUtils.resetNetworkState();
    });

    it('オフライン時、キャッシュが無効でも古いキャッシュデータがあればそれを返す', async () => {
      // Arrange: オフライン状態を設定
      networkUtils.setNetworkState(false);

      const mockCacheValidator = createMockCacheValidator({
        data: mockNewsData, // 古いキャッシュデータがある
        isValid: false, // だがisValidはfalse(期限切れ等)
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockNewsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: NewsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new NewsRepository(config);

      // Act
      const result = await repository.getTodayNews();

      // Assert: オフラインなのでSupabaseにはアクセスせずキャッシュを返す
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNewsData);
      expect(result.source).toBe('cache');
      expect(mockSupabaseFetcher).not.toHaveBeenCalled();
    });

    it('オフライン時、キャッシュデータがなければエラーを返す', async () => {
      // Arrange: オフライン状態を設定
      networkUtils.setNetworkState(false);

      const mockCacheValidator = createMockCacheValidator({
        data: null, // キャッシュなし
        isValid: false,
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockNewsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: NewsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new NewsRepository(config);

      // Act
      const result = await repository.getTodayNews();

      // Assert: オフラインでキャッシュもないのでエラー
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('OFFLINE');
      expect(result.error?.retryable).toBe(true);
      expect(mockSupabaseFetcher).not.toHaveBeenCalled();
    });

    it('オンライン時はキャッシュが無効なら通常通りSupabaseから取得する', async () => {
      // Arrange: オンライン状態(デフォルト)
      networkUtils.setNetworkState(true);

      const mockCacheValidator = createMockCacheValidator({
        data: mockNewsData, // 古いキャッシュデータがある
        isValid: false, // だがisValidはfalse
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockNewsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: NewsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new NewsRepository(config);

      // Act
      const result = await repository.getTodayNews();

      // Assert: オンラインなので通常通りSupabaseから取得
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNewsData);
      expect(result.source).toBe('supabase');
      expect(mockSupabaseFetcher).toHaveBeenCalled();
    });
  });
});
