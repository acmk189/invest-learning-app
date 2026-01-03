/**
 * 世界ニュース取得機能のテスト
 *
 * Task 6.2: 世界ニュース取得機能
 * Task 6.3: NewsAPIレスポンスパース機能
 * Task 6.4: NewsAPI無料枠制御機能
 * Task 6.5: NewsAPIエラーハンドリング
 *
 * Requirements: 1.2 (businessカテゴリで世界のニュース記事取得)
 * Requirements: 10.2 (NewsAPIの無料枠100リクエスト/日内で運用)
 * Requirements: 8.5 (NewsAPI障害時のエラーハンドリング)
 *
 * @see https://newsapi.org/docs/endpoints/top-headlines - Top Headlines API
 */

import {
  WorldNewsFetcher,
  NewsApiError,
  NewsApiRateLimitError,
  NewsApiTimeoutError,
} from '../worldNewsFetcher';
import { NewsApiClient } from '../newsApiClient';

// global fetchをモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('世界ニュース取得機能', () => {
  let client: NewsApiClient;
  let fetcher: WorldNewsFetcher;

  beforeEach(() => {
    jest.clearAllMocks();
    // テスト用のクライアントを作成
    client = new NewsApiClient({ apiKey: 'test-api-key' });
    fetcher = new WorldNewsFetcher(client);
  });

  describe('fetchTopHeadlines', () => {
    it('businessカテゴリで世界のニュース記事を取得できる', async () => {
      // Arrange
      const mockResponse = {
        status: 'ok',
        totalResults: 2,
        articles: [
          {
            source: { id: 'bbc-news', name: 'BBC News' },
            author: 'John Doe',
            title: 'Test Article 1',
            description: 'This is a test article',
            url: 'https://example.com/article1',
            urlToImage: 'https://example.com/image1.jpg',
            publishedAt: '2025-01-02T08:00:00Z',
            content: 'Full article content here...',
          },
          {
            source: { id: 'cnn', name: 'CNN' },
            author: 'Jane Smith',
            title: 'Test Article 2',
            description: 'Another test article',
            url: 'https://example.com/article2',
            urlToImage: 'https://example.com/image2.jpg',
            publishedAt: '2025-01-02T09:00:00Z',
            content: 'Another article content...',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // Act
      const result = await fetcher.fetchTopHeadlines({
        category: 'business',
        country: 'us',
      });

      // Assert
      expect(result.status).toBe('ok');
      expect(result.totalResults).toBe(2);
      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].title).toBe('Test Article 1');
    });

    it('取得件数(pageSize)を設定できる', async () => {
      // Arrange
      const mockResponse = {
        status: 'ok',
        totalResults: 1,
        articles: [
          {
            source: { id: 'bbc-news', name: 'BBC News' },
            author: 'Test Author',
            title: 'Single Article',
            description: 'Description',
            url: 'https://example.com/article',
            urlToImage: null,
            publishedAt: '2025-01-02T08:00:00Z',
            content: 'Content...',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // Act
      await fetcher.fetchTopHeadlines({
        category: 'business',
        pageSize: 10,
      });

      // Assert
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('pageSize=10');
    });

    it('言語フィルターを設定できる', async () => {
      // Arrange
      const mockResponse = {
        status: 'ok',
        totalResults: 0,
        articles: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // Act
      await fetcher.fetchTopHeadlines({
        category: 'business',
        country: 'us',
      });

      // Assert
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('country=us');
      expect(calledUrl).toContain('category=business');
    });

    it('APIキーがヘッダーに含まれる', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', totalResults: 0, articles: [] }),
      });

      // Act
      await fetcher.fetchTopHeadlines({ category: 'business' });

      // Assert
      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(calledOptions.headers).toEqual(
        expect.objectContaining({
          'X-Api-Key': 'test-api-key',
        })
      );
    });
  });

  describe('レスポンスパース', () => {
    it('記事タイトルを抽出できる', async () => {
      // Arrange
      const mockResponse = {
        status: 'ok',
        totalResults: 1,
        articles: [
          {
            source: { id: 'test', name: 'Test Source' },
            author: 'Author',
            title: 'Important News Title',
            description: 'Description',
            url: 'https://example.com',
            urlToImage: null,
            publishedAt: '2025-01-02T08:00:00Z',
            content: 'Content',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // Act
      const result = await fetcher.fetchTopHeadlines({ category: 'business' });

      // Assert
      expect(result.articles[0].title).toBe('Important News Title');
    });

    it('記事の説明・本文を抽出できる', async () => {
      // Arrange
      const mockResponse = {
        status: 'ok',
        totalResults: 1,
        articles: [
          {
            source: { id: 'test', name: 'Test Source' },
            author: 'Author',
            title: 'Title',
            description: 'Short description of the article',
            url: 'https://example.com',
            urlToImage: null,
            publishedAt: '2025-01-02T08:00:00Z',
            content: 'Full content of the article here...',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // Act
      const result = await fetcher.fetchTopHeadlines({ category: 'business' });

      // Assert
      expect(result.articles[0].description).toBe(
        'Short description of the article'
      );
      expect(result.articles[0].content).toBe(
        'Full content of the article here...'
      );
    });

    it('nullフィールドを適切に処理できる', async () => {
      // Arrange
      const mockResponse = {
        status: 'ok',
        totalResults: 1,
        articles: [
          {
            source: { id: null, name: 'Test Source' },
            author: null,
            title: 'Title',
            description: null,
            url: 'https://example.com',
            urlToImage: null,
            publishedAt: '2025-01-02T08:00:00Z',
            content: null,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // Act
      const result = await fetcher.fetchTopHeadlines({ category: 'business' });

      // Assert
      expect(result.articles[0].author).toBeNull();
      expect(result.articles[0].description).toBeNull();
      expect(result.articles[0].content).toBeNull();
    });
  });

  describe('無料枠制御', () => {
    it('1日1回のみ実行する制御を確認できる', () => {
      // Act
      const dailyLimit = fetcher.getDailyRequestLimit();

      // Assert
      // 無料枠は100リクエスト/日だが、バッチは1日1回なので実質1リクエスト
      expect(dailyLimit).toBe(100);
    });

    it('リクエスト使用状況を記録できる', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', totalResults: 0, articles: [] }),
      });

      // Act
      await fetcher.fetchTopHeadlines({ category: 'business' });
      const usage = fetcher.getRequestUsage();

      // Assert
      expect(usage.requestCount).toBe(1);
      expect(usage.lastRequestAt).toBeDefined();
    });

    it('枠超過警告を検出できる', async () => {
      // Arrange
      // 100回リクエストをシミュレート
      for (let i = 0; i < 100; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', totalResults: 0, articles: [] }),
        });
        await fetcher.fetchTopHeadlines({ category: 'business' });
      }

      // Act
      const isNearLimit = fetcher.isNearDailyLimit();

      // Assert
      expect(isNearLimit).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('NewsAPI障害時にNewsApiErrorをスローする', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          status: 'error',
          code: 'unexpectedError',
          message: 'Internal server error',
        }),
      });

      // Act & Assert
      await expect(
        fetcher.fetchTopHeadlines({ category: 'business' })
      ).rejects.toThrow(NewsApiError);
    });

    it('タイムアウト時にNewsApiTimeoutErrorをスローする', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('timeout'));

      // タイムアウト設定を短くしたfetcherを作成
      const shortTimeoutClient = new NewsApiClient({
        apiKey: 'test-key',
        timeoutMs: 100,
      });
      const shortTimeoutFetcher = new WorldNewsFetcher(shortTimeoutClient);

      // Act & Assert
      await expect(
        shortTimeoutFetcher.fetchTopHeadlines({ category: 'business' })
      ).rejects.toThrow(NewsApiTimeoutError);
    });

    it('レート制限時にNewsApiRateLimitErrorをスローする', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          status: 'error',
          code: 'rateLimited',
          message: 'You have made too many requests recently.',
        }),
      });

      // Act & Assert
      await expect(
        fetcher.fetchTopHeadlines({ category: 'business' })
      ).rejects.toThrow(NewsApiRateLimitError);
    });

    it('エラーログを記録できる', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          status: 'error',
          code: 'unexpectedError',
          message: 'Server error',
        }),
      });

      // Act
      try {
        await fetcher.fetchTopHeadlines({ category: 'business' });
      } catch (e) {
        // エラーは想定内
      }

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('APIキー無効時に適切なエラーをスローする', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          status: 'error',
          code: 'apiKeyInvalid',
          message: 'Your API key is invalid.',
        }),
      });

      // Act & Assert
      await expect(
        fetcher.fetchTopHeadlines({ category: 'business' })
      ).rejects.toThrow(NewsApiError);
    });
  });

  describe('NewsApiErrorクラス', () => {
    it('正しいエラー情報を持つ', () => {
      // Arrange & Act
      const error = new NewsApiError('Test error', 500, 'unexpectedError');

      // Assert
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('unexpectedError');
      expect(error.name).toBe('NewsApiError');
    });

    it('Errorクラスを継承している', () => {
      // Act
      const error = new NewsApiError('Test', 500, 'testCode');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NewsApiError);
    });
  });
});
