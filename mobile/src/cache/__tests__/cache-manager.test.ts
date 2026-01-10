/**
 * キャッシュマネージャー テスト
 * Task 2.3: キャッシュ管理システム実装
 *
 * RED-GREEN-REFACTORサイクルに従い、テストを先に実装する
 * 案B: メタデータによる軽量チェックロジックを含む
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager } from '../cache-manager';
import { NewsData, TermsData, CacheEntry, BatchMetadata } from '../types';

// AsyncStorageのモック
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockMetadataFetcher: jest.Mock<Promise<BatchMetadata | null>>;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  // テスト用日付のセットアップ
  const mockDate = new Date('2026-01-01T09:00:00+09:00');

  beforeEach(() => {
    jest.clearAllMocks();
    mockMetadataFetcher = jest.fn();
    cacheManager = new CacheManager(mockMetadataFetcher);

    // 日付をモック
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateCacheKey', () => {
    it('日付ベースのニュースキャッシュキーを生成する', () => {
      const key = CacheManager.generateCacheKey('news', '2026-01-01');
      expect(key).toBe('cache_news_2026-01-01');
    });

    it('日付ベースの用語キャッシュキーを生成する', () => {
      const key = CacheManager.generateCacheKey('terms', '2026-01-01');
      expect(key).toBe('cache_terms_2026-01-01');
    });

    it('今日の日付でニュースキャッシュキーを生成する', () => {
      const key = CacheManager.generateTodayCacheKey('news');
      expect(key).toBe('cache_news_2026-01-01');
    });

    it('今日の日付で用語キャッシュキーを生成する', () => {
      const key = CacheManager.generateTodayCacheKey('terms');
      expect(key).toBe('cache_terms_2026-01-01');
    });
  });

  describe('setCache', () => {
    it('ニュースデータをキャッシュに保存する(cachedAtを記録)', async () => {
      const newsData: NewsData = {
        worldNews: {
          title: '世界のニュース',
          summary: '要約文',
          updatedAt: '2026-01-01T08:00:00Z',
        },
        japanNews: {
          title: '日本のニュース',
          summary: '要約文',
          updatedAt: '2026-01-01T08:00:00Z',
        },
      };

      await cacheManager.setCache('news', '2026-01-01', newsData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1);
      const [key, value] = mockAsyncStorage.setItem.mock.calls[0];
      expect(key).toBe('cache_news_2026-01-01');

      const parsed = JSON.parse(value as string) as CacheEntry<NewsData>;
      expect(parsed.data).toEqual(newsData);
      expect(parsed.cachedAt).toBeDefined();
      expect(parsed.cachedAt).toBe(mockDate.getTime());
    });

    it('用語データをキャッシュに保存する', async () => {
      const termsData: TermsData = {
        terms: [
          { name: '用語1', description: '説明1' },
          { name: '用語2', description: '説明2' },
          { name: '用語3', description: '説明3' },
        ],
        deliveredAt: '2026-01-01T08:00:00Z',
      };

      await cacheManager.setCache('terms', '2026-01-01', termsData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1);
      const [key, value] = mockAsyncStorage.setItem.mock.calls[0];
      expect(key).toBe('cache_terms_2026-01-01');

      const parsed = JSON.parse(value as string) as CacheEntry<TermsData>;
      expect(parsed.data).toEqual(termsData);
      expect(parsed.cachedAt).toBeDefined();
    });
  });

  describe('getCacheEntry', () => {
    it('キャッシュエントリが存在する場合、エントリを取得する', async () => {
      const newsData: NewsData = {
        worldNews: {
          title: '世界のニュース',
          summary: '要約文',
          updatedAt: '2026-01-01T08:00:00Z',
        },
        japanNews: {
          title: '日本のニュース',
          summary: '要約文',
          updatedAt: '2026-01-01T08:00:00Z',
        },
      };

      const cacheEntry: CacheEntry<NewsData> = {
        data: newsData,
        cachedAt: Date.now(),
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cacheManager.getCacheEntry<NewsData>('news', '2026-01-01');

      expect(result).toEqual(cacheEntry);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('cache_news_2026-01-01');
    });

    it('キャッシュが存在しない場合、nullを返す', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await cacheManager.getCacheEntry<NewsData>('news', '2026-01-01');

      expect(result).toBeNull();
    });

    it('JSONパースエラーの場合、nullを返す', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json');

      const result = await cacheManager.getCacheEntry<NewsData>('news', '2026-01-01');

      expect(result).toBeNull();
    });
  });

  describe('getValidatedCache(メタデータチェック)', () => {
    const newsData: NewsData = {
      worldNews: {
        title: '世界のニュース',
        summary: '要約文',
        updatedAt: '2026-01-01T08:00:00Z',
      },
      japanNews: {
        title: '日本のニュース',
        summary: '要約文',
        updatedAt: '2026-01-01T08:00:00Z',
      },
    };

    it('キャッシュが存在しない場合、nullを返す', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await cacheManager.getValidatedCache<NewsData>('news', '2026-01-01');

      expect(result).toEqual({ data: null, isValid: false });
    });

    it('メタデータ取得失敗(オフライン)時、キャッシュをそのまま返す', async () => {
      const cacheEntry: CacheEntry<NewsData> = {
        data: newsData,
        cachedAt: Date.now() - 3600000, // 1時間前
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));
      mockMetadataFetcher.mockResolvedValueOnce(null); // オフライン

      const result = await cacheManager.getValidatedCache<NewsData>('news', '2026-01-01');

      expect(result).toEqual({ data: newsData, isValid: true });
    });

    it('メタデータのlastUpdated <= cachedAtの場合、キャッシュを返す(キャッシュ有効)', async () => {
      const cachedAt = Date.now() - 3600000; // 1時間前
      const cacheEntry: CacheEntry<NewsData> = {
        data: newsData,
        cachedAt,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));
      mockMetadataFetcher.mockResolvedValueOnce({
        newsLastUpdated: cachedAt - 1000, // キャッシュより古い
        termsLastUpdated: cachedAt - 1000,
      });

      const result = await cacheManager.getValidatedCache<NewsData>('news', '2026-01-01');

      expect(result).toEqual({ data: newsData, isValid: true });
    });

    it('メタデータのlastUpdated > cachedAtの場合、nullを返しキャッシュを削除(新データあり)', async () => {
      const cachedAt = Date.now() - 3600000; // 1時間前
      const cacheEntry: CacheEntry<NewsData> = {
        data: newsData,
        cachedAt,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));
      mockMetadataFetcher.mockResolvedValueOnce({
        newsLastUpdated: Date.now(), // キャッシュより新しい
        termsLastUpdated: cachedAt - 1000,
      });

      const result = await cacheManager.getValidatedCache<NewsData>('news', '2026-01-01');

      expect(result).toEqual({ data: null, isValid: false });
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cache_news_2026-01-01');
    });

    it('用語キャッシュでもメタデータチェックが正しく動作する', async () => {
      const termsData: TermsData = {
        terms: [{ name: '用語1', description: '説明1' }],
        deliveredAt: '2026-01-01T08:00:00Z',
      };

      const cachedAt = Date.now() - 3600000;
      const cacheEntry: CacheEntry<TermsData> = {
        data: termsData,
        cachedAt,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));
      mockMetadataFetcher.mockResolvedValueOnce({
        newsLastUpdated: cachedAt - 1000,
        termsLastUpdated: Date.now(), // 用語が更新された
      });

      const result = await cacheManager.getValidatedCache<TermsData>('terms', '2026-01-01');

      expect(result).toEqual({ data: null, isValid: false });
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cache_terms_2026-01-01');
    });
  });

  describe('getTodayValidatedCache', () => {
    it('今日のニュースキャッシュを検証付きで取得する', async () => {
      const newsData: NewsData = {
        worldNews: {
          title: '世界のニュース',
          summary: '要約文',
          updatedAt: '2026-01-01T08:00:00Z',
        },
        japanNews: {
          title: '日本のニュース',
          summary: '要約文',
          updatedAt: '2026-01-01T08:00:00Z',
        },
      };

      const cachedAt = Date.now() - 1000;
      const cacheEntry: CacheEntry<NewsData> = {
        data: newsData,
        cachedAt,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));
      mockMetadataFetcher.mockResolvedValueOnce({
        newsLastUpdated: cachedAt - 1000, // キャッシュより古い
        termsLastUpdated: cachedAt - 1000,
      });

      const result = await cacheManager.getTodayValidatedCache<NewsData>('news');

      expect(result).toEqual({ data: newsData, isValid: true });
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('cache_news_2026-01-01');
    });
  });

  describe('clearOldCache', () => {
    it('古いキャッシュを全て削除する(日付ベース)', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValueOnce([
        'cache_news_2026-01-01', // 今日
        'cache_news_2025-12-31', // 昨日
        'cache_news_2025-12-30', // 2日前
        'cache_terms_2026-01-01', // 今日
        'other_key', // キャッシュ以外のキー
      ]);

      await cacheManager.clearOldCache();

      // 今日以外のキャッシュが削除される
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'cache_news_2025-12-31',
        'cache_news_2025-12-30',
      ]);
    });
  });

  describe('clearAllCache', () => {
    it('全てのキャッシュを削除する', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValueOnce([
        'cache_news_2026-01-01',
        'cache_terms_2026-01-01',
        'cache_news_2025-12-31',
        'other_key', // キャッシュ以外のキー
      ]);

      await cacheManager.clearAllCache();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'cache_news_2026-01-01',
        'cache_terms_2026-01-01',
        'cache_news_2025-12-31',
      ]);
    });
  });

  describe('hasCacheEntry', () => {
    it('キャッシュエントリが存在する場合、trueを返す', async () => {
      const cacheEntry: CacheEntry<NewsData> = {
        data: {} as NewsData,
        cachedAt: Date.now(),
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cacheManager.hasCacheEntry('news', '2026-01-01');

      expect(result).toBe(true);
    });

    it('キャッシュが存在しない場合、falseを返す', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await cacheManager.hasCacheEntry('news', '2026-01-01');

      expect(result).toBe(false);
    });
  });

  describe('パフォーマンス要件', () => {
    it('キャッシュ読み込みが1秒以内に完了する(モック環境、オフライン時)', async () => {
      const newsData: NewsData = {
        worldNews: {
          title: '世界のニュース',
          summary: '要約文'.repeat(1000), // 大きなデータ
          updatedAt: '2026-01-01T08:00:00Z',
        },
        japanNews: {
          title: '日本のニュース',
          summary: '要約文'.repeat(1000),
          updatedAt: '2026-01-01T08:00:00Z',
        },
      };

      const cacheEntry: CacheEntry<NewsData> = {
        data: newsData,
        cachedAt: Date.now(),
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));
      mockMetadataFetcher.mockResolvedValueOnce(null); // オフライン

      const startTime = Date.now();
      await cacheManager.getTodayValidatedCache<NewsData>('news');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
