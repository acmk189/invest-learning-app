/**
 * キャッシュマネージャー テスト
 * Task 2.3: キャッシュ管理システム実装
 *
 * RED-GREEN-REFACTORサイクルに従い、テストを先に実装する
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager } from '../cache-manager';
import { CacheKey, NewsData, TermsData, CacheEntry } from '../types';

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
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  // テスト用日付のセットアップ
  const mockDate = new Date('2026-01-01T09:00:00+09:00');

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager = new CacheManager();

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
    it('ニュースデータをキャッシュに保存する', async () => {
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
      expect(parsed.expiresAt).toBeDefined();
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
    });

    it('キャッシュの有効期限が翌日の00:00に設定される', async () => {
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

      const [, value] = mockAsyncStorage.setItem.mock.calls[0];
      const parsed = JSON.parse(value as string) as CacheEntry<NewsData>;

      // 有効期限は翌日の00:00（JST）
      const expectedExpiresAt = new Date('2026-01-02T00:00:00+09:00').getTime();
      expect(parsed.expiresAt).toBe(expectedExpiresAt);
    });
  });

  describe('getCache', () => {
    it('キャッシュが存在する場合、データを取得する', async () => {
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
        expiresAt: new Date('2026-01-02T00:00:00+09:00').getTime(),
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cacheManager.getCache<NewsData>('news', '2026-01-01');

      expect(result).toEqual(newsData);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('cache_news_2026-01-01');
    });

    it('キャッシュが存在しない場合、nullを返す', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await cacheManager.getCache<NewsData>('news', '2026-01-01');

      expect(result).toBeNull();
    });

    it('キャッシュが期限切れの場合、nullを返し、キャッシュを削除する', async () => {
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
        cachedAt: Date.now() - 86400000, // 1日前
        expiresAt: Date.now() - 1000, // 期限切れ
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cacheManager.getCache<NewsData>('news', '2026-01-01');

      expect(result).toBeNull();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cache_news_2026-01-01');
    });

    it('JSONパースエラーの場合、nullを返す', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json');

      const result = await cacheManager.getCache<NewsData>('news', '2026-01-01');

      expect(result).toBeNull();
    });
  });

  describe('getTodayCache', () => {
    it('今日のニュースキャッシュを取得する', async () => {
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
        expiresAt: new Date('2026-01-02T00:00:00+09:00').getTime(),
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cacheManager.getTodayCache<NewsData>('news');

      expect(result).toEqual(newsData);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('cache_news_2026-01-01');
    });
  });

  describe('clearExpiredCache', () => {
    it('期限切れのキャッシュを全て削除する', async () => {
      const validEntry: CacheEntry<NewsData> = {
        data: {} as NewsData,
        cachedAt: Date.now(),
        expiresAt: Date.now() + 86400000, // 明日
      };

      const expiredEntry: CacheEntry<NewsData> = {
        data: {} as NewsData,
        cachedAt: Date.now() - 86400000,
        expiresAt: Date.now() - 1000, // 期限切れ
      };

      mockAsyncStorage.getAllKeys.mockResolvedValueOnce([
        'cache_news_2026-01-01',
        'cache_news_2025-12-31', // 古いキャッシュ
        'cache_terms_2026-01-01',
        'other_key', // キャッシュ以外のキー
      ]);

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(validEntry)) // cache_news_2026-01-01
        .mockResolvedValueOnce(JSON.stringify(expiredEntry)) // cache_news_2025-12-31
        .mockResolvedValueOnce(JSON.stringify(validEntry)); // cache_terms_2026-01-01

      await cacheManager.clearExpiredCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('cache_news_2025-12-31');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledTimes(1);
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

  describe('isCacheValid', () => {
    it('有効なキャッシュが存在する場合、trueを返す', async () => {
      const cacheEntry: CacheEntry<NewsData> = {
        data: {} as NewsData,
        cachedAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cacheManager.isCacheValid('news', '2026-01-01');

      expect(result).toBe(true);
    });

    it('キャッシュが存在しない場合、falseを返す', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await cacheManager.isCacheValid('news', '2026-01-01');

      expect(result).toBe(false);
    });

    it('キャッシュが期限切れの場合、falseを返す', async () => {
      const cacheEntry: CacheEntry<NewsData> = {
        data: {} as NewsData,
        cachedAt: Date.now() - 86400000,
        expiresAt: Date.now() - 1000, // 期限切れ
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cacheManager.isCacheValid('news', '2026-01-01');

      expect(result).toBe(false);
    });
  });

  describe('パフォーマンス要件', () => {
    it('キャッシュ読み込みが1秒以内に完了する（モック環境）', async () => {
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
        expiresAt: new Date('2026-01-02T00:00:00+09:00').getTime(),
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const startTime = Date.now();
      await cacheManager.getTodayCache<NewsData>('news');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
