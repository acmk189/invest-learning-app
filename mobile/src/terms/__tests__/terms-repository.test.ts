/**
 * Terms Repository テスト
 * Task 21: Terms Repository
 * Task 11: オフライン対応強化 - Supabase対応
 *
 * TDDに従い、Terms Repositoryのテストを先に記述します。
 *
 * Requirements:
 * - 5.1: 用語タブで3つ表示
 * - 5.3: 1日中同じ3用語表示
 * - 5.4: オフライン時キャッシュ済み用語表示
 * - 7.5: エラー時リトライオプション提供
 * - 10: オフライン対応強化
 */

import { TermsRepository, TermsResult, TermsRepositoryConfig } from '../terms-repository';
import { TermsData, SupabaseQueryResult } from '../../supabase/types';
import { CacheValidationResult } from '../../cache/cache-manager';
import { SupabaseError } from '../../supabase/errors';
import * as networkUtils from '../../utils/network';

// モックデータ: 今日の3つの用語
const mockTermsData: TermsData = {
  date: '2024-01-15',
  terms: [
    {
      name: 'PER(株価収益率)',
      description:
        '株価を1株当たり利益で割った指標。企業の収益性と株価の割安・割高を判断する際に使用されます。PERが低いほど割安とされますが、業界や成長性によって適正水準は異なります。一般的に成長企業は高めのPERが許容される傾向があります。',
      difficulty: 'beginner',
    },
    {
      name: 'REIT(不動産投資信託)',
      description:
        '投資家から集めた資金で不動産に投資し、その賃料収入や売買益を投資家に分配する金融商品。少額から不動産投資が可能で、株式市場で売買できる流動性の高さが特徴です。オフィスビル、商業施設、住宅など様々なタイプがあります。',
      difficulty: 'intermediate',
    },
    {
      name: 'デリバティブ(金融派生商品)',
      description:
        '株式、債券、通貨などの原資産から派生した金融商品の総称。先物取引、オプション取引、スワップ取引などが含まれます。リスクヘッジや投機目的で利用され、少額の証拠金で大きな取引が可能なレバレッジ効果があります。',
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

describe('TermsRepository', () => {
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

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

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

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

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

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

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

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

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

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

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

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

      // Act
      const result = await repository.getTodayTerms();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTermsData);
    });

    it('3つの用語が含まれるデータを正しく返す(Requirement 5.1)', async () => {
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

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

      // Act
      const result = await repository.getTodayTerms();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.terms).toHaveLength(3);
      expect(result.data?.terms[0].name).toBe('PER(株価収益率)');
      expect(result.data?.terms[1].name).toBe('REIT(不動産投資信託)');
      expect(result.data?.terms[2].name).toBe('デリバティブ(金融派生商品)');
    });

    it('各用語に難易度が設定されている(Requirement 4.4)', async () => {
      // Arrange
      const mockCacheValidator = createMockCacheValidator({
        data: mockTermsData,
        isValid: true,
      });
      const config: TermsRepositoryConfig = {
        cacheValidator: mockCacheValidator,
      };

      const repository = new TermsRepository(config);

      // Act
      const result = await repository.getTodayTerms();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.terms[0].difficulty).toBe('beginner');
      expect(result.data?.terms[1].difficulty).toBe('intermediate');
      expect(result.data?.terms[2].difficulty).toBe('advanced');
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

  describe('Offline Fallback (Requirement 5.4, 10)', () => {
    beforeEach(() => {
      // ネットワーク状態をリセット
      networkUtils.resetNetworkState();
    });

    it('オフライン時、キャッシュが無効でも古いキャッシュデータがあればそれを返す', async () => {
      // Arrange: オフライン状態を設定
      networkUtils.setNetworkState(false);

      const mockCacheValidator = createMockCacheValidator({
        data: mockTermsData, // 古いキャッシュデータがある
        isValid: false, // だがisValidはfalse(期限切れ等)
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockTermsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

      // Act
      const result = await repository.getTodayTerms();

      // Assert: オフラインなのでSupabaseにはアクセスせずキャッシュを返す
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTermsData);
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
        data: mockTermsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

      // Act
      const result = await repository.getTodayTerms();

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
        data: mockTermsData, // 古いキャッシュデータがある
        isValid: false, // だがisValidはfalse
      });
      const mockSupabaseFetcher = createMockSupabaseFetcher({
        data: mockTermsData,
        exists: true,
      });
      const mockCacheSetter = createMockCacheSetter();

      const config: TermsRepositoryConfig = {
        supabaseFetcher: mockSupabaseFetcher,
        cacheValidator: mockCacheValidator,
        cacheSetter: mockCacheSetter,
      };

      const repository = new TermsRepository(config);

      // Act
      const result = await repository.getTodayTerms();

      // Assert: オンラインなので通常通りSupabaseから取得
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTermsData);
      expect(result.source).toBe('supabase');
      expect(mockSupabaseFetcher).toHaveBeenCalled();
    });
  });
});
