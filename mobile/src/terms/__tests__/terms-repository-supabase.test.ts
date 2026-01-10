/**
 * Terms Repository テスト (Supabase版)
 * Task 10.2: TermsRepository移行
 *
 * TDDに従い、Supabase対応のTerms Repositoryテストを記述します。
 *
 * Requirements:
 * - 9: フロントエンドRepository移行
 * - 5.1: 用語タブで3つ表示
 * - 5.3: 1日中同じ3用語表示
 * - 5.4: オフライン時キャッシュ済み用語表示
 * - 7.5: エラー時リトライオプション提供
 */

import {
  TermsRepositorySupabase,
  TermsResult,
  TermsRepositorySupabaseConfig,
} from '../terms-repository-supabase';
import { TermsData, SupabaseQueryResult } from '../../supabase/types';
import { CacheValidationResult } from '../../cache/cache-manager';
import { SupabaseError } from '../../supabase/errors';

// モックデータ
const mockTermsData: TermsData = {
  date: '2024-01-15',
  terms: [
    {
      name: 'PER(株価収益率)',
      description: 'PERとは、株価を1株あたり純利益で割った値...',
      difficulty: 'beginner',
    },
    {
      name: 'PBR(株価純資産倍率)',
      description: 'PBRとは、株価を1株あたり純資産で割った値...',
      difficulty: 'intermediate',
    },
    {
      name: 'ROE(自己資本利益率)',
      description: 'ROEとは、純利益を自己資本で割った値...',
      difficulty: 'advanced',
    },
  ],
  createdAt: '2024-01-15T08:00:00.000Z',
  updatedAt: '2024-01-15T08:00:00.000Z',
};

// Supabaseクエリのモック
const createMockSupabaseFetcher = (
  result: SupabaseQueryResult<TermsData>
): (() => Promise<SupabaseQueryResult<TermsData>>) => {
  return jest.fn().mockResolvedValue(result);
};

// キャッシュの検証結果モック
const createMockCacheValidator = (
  result: CacheValidationResult<TermsData>
): ((type: 'news' | 'terms', dateStr: string) => Promise<CacheValidationResult<TermsData>>) => {
  return jest.fn().mockResolvedValue(result);
};

// キャッシュ保存のモック
const createMockCacheSetter = (): ((
  type: 'news' | 'terms',
  dateStr: string,
  data: TermsData
) => Promise<void>) => {
  return jest.fn().mockResolvedValue(undefined);
};

describe('TermsRepositorySupabase', () => {
  describe('getTodayTerms', () => {
    it('キャッシュが有効な場合、キャッシュからデータを返す', async () => {
      // Arrange
      const mockCacheValidator = createMockCacheValidator({
        data: mockTermsData,
        isValid: true,
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockTermsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: TermsRepositorySupabaseConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepositorySupabase(config);

      // Act
      const result = await repository.getTodayTerms();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTermsData);
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
        data: mockTermsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: TermsRepositorySupabaseConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepositorySupabase(config);

      // Act
      const result = await repository.getTodayTerms();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTermsData);
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

      const config: TermsRepositorySupabaseConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepositorySupabase(config);

      // Act
      const result = await repository.getTodayTerms();

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

      const config: TermsRepositorySupabaseConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepositorySupabase(config);

      // Act
      const result = await repository.getTodayTerms();

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
        data: mockTermsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: TermsRepositorySupabaseConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepositorySupabase(config);

      // Act
      const result = await repository.getTodayTerms();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTermsData);
      expect(result.source).toBe('supabase');
    });

    it('キャッシュ保存でエラーが発生しても結果は成功として返す', async () => {
      // Arrange
      const mockCacheValidator = createMockCacheValidator({
        data: null,
        isValid: false,
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockTermsData,
        exists: true,
      });
      const mockCacheSetter = jest.fn().mockRejectedValue(new Error('Cache write error'));

      const config: TermsRepositorySupabaseConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepositorySupabase(config);

      // Act
      const result = await repository.getTodayTerms();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTermsData);
    });
  });

  describe('TermsResult 型', () => {
    it('成功結果は正しい形式を持つ', () => {
      const successResult: TermsResult = {
        success: true,
        data: mockTermsData,
        source: 'cache',
      };

      expect(successResult.success).toBe(true);
      expect(successResult.data).toBeDefined();
      expect(successResult.data?.terms).toHaveLength(3);
      expect(successResult.error).toBeUndefined();
    });

    it('失敗結果は正しい形式を持つ', () => {
      const failureResult: TermsResult = {
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
});
