/**
 * 日本経済ニュースRSS取得機能テスト
 *
 * Task 7.2: 日本経済ニュースRSS取得機能
 * Task 7.4: RSS取得タイムアウト・エラーハンドリング
 * Requirements: 1.3 (Google News RSSから日本の投資・経済ニュース取得)
 * Requirements: 8.5 (RSS取得失敗時のエラーハンドリング)
 */

import { JapanNewsFetcher, RssError, RssTimeoutError, RssNetworkError } from '../japanNewsFetcher';
import { RssParser } from '../rssParser';
import type { GoogleNewsRssFeed, GoogleNewsRssItem } from '../types';

// RssParserをモック化
jest.mock('../rssParser');

describe('JapanNewsFetcher', () => {
  let fetcher: JapanNewsFetcher;
  let mockParser: jest.Mocked<RssParser>;

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // モックパーサーのセットアップ
    mockParser = new RssParser() as jest.Mocked<RssParser>;
    fetcher = new JapanNewsFetcher(mockParser);
  });

  describe('初期化', () => {
    it('デフォルト設定で初期化できる', () => {
      const config = fetcher.getConfig();

      expect(config.feedUrl).toContain('news.google.com');
      expect(config.timeoutMs).toBe(30000);
      expect(config.maxItems).toBe(10);
    });

    it('カスタム設定で初期化できる', () => {
      const customFetcher = new JapanNewsFetcher(mockParser, {
        feedUrl: 'https://custom.example.com/rss',
        timeoutMs: 15000,
        maxItems: 5,
      });
      const config = customFetcher.getConfig();

      expect(config.feedUrl).toBe('https://custom.example.com/rss');
      expect(config.timeoutMs).toBe(15000);
      expect(config.maxItems).toBe(5);
    });
  });

  describe('fetchJapanNews', () => {
    const mockFeed: GoogleNewsRssFeed = {
      title: 'Google ニュース - ビジネス',
      description: '日本のビジネスニュース',
      link: 'https://news.google.com',
      lastBuildDate: '2026-01-02T08:00:00Z',
      items: [
        {
          title: '日経平均株価が3万円突破',
          link: 'https://example.com/article1',
          description: '日本の株式市場が好調',
          publishedAt: '2026-01-02T07:00:00Z',
          source: '日本経済新聞',
        },
        {
          title: '円相場が安定推移',
          link: 'https://example.com/article2',
          description: '為替市場の動向',
          publishedAt: '2026-01-02T06:00:00Z',
          source: 'Bloomberg',
        },
      ],
    };

    it('正常にニュースを取得できる', async () => {
      // モックの設定
      mockParser.parseURL = jest.fn().mockResolvedValue(mockFeed);

      const result = await fetcher.fetchJapanNews();

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe('日経平均株価が3万円突破');
      expect(result.items[0].source).toBe('日本経済新聞');
      expect(mockParser.parseURL).toHaveBeenCalledTimes(1);
    });

    it('maxItems設定に従って記事数を制限する', async () => {
      const limitedFetcher = new JapanNewsFetcher(mockParser, { maxItems: 1 });
      mockParser.parseURL = jest.fn().mockResolvedValue(mockFeed);

      const result = await limitedFetcher.fetchJapanNews();

      expect(result.items).toHaveLength(1);
    });

    it('空のフィードでも正常に処理できる', async () => {
      const emptyFeed: GoogleNewsRssFeed = {
        title: 'Empty Feed',
        description: null,
        link: 'https://news.google.com',
        lastBuildDate: null,
        items: [],
      };
      mockParser.parseURL = jest.fn().mockResolvedValue(emptyFeed);

      const result = await fetcher.fetchJapanNews();

      expect(result.items).toHaveLength(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('タイムアウト時にRssTimeoutErrorをスローする', async () => {
      // タイムアウトエラーをシミュレート
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      mockParser.parseURL = jest.fn().mockRejectedValue(timeoutError);

      await expect(fetcher.fetchJapanNews()).rejects.toThrow(RssTimeoutError);
    });

    it('ネットワークエラー時にRssNetworkErrorをスローする', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'FetchError';
      mockParser.parseURL = jest.fn().mockRejectedValue(networkError);

      await expect(fetcher.fetchJapanNews()).rejects.toThrow(RssNetworkError);
    });

    it('パースエラー時にRssErrorをスローする', async () => {
      const parseError = new Error('Invalid XML');
      mockParser.parseURL = jest.fn().mockRejectedValue(parseError);

      await expect(fetcher.fetchJapanNews()).rejects.toThrow(RssError);
    });

    it('エラー時にログを出力する', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      mockParser.parseURL = jest.fn().mockRejectedValue(error);

      await expect(fetcher.fetchJapanNews()).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Google News RSS Error]'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getDefaultFeedUrl', () => {
    it('日本語・日本地域のビジネスニュースURLを返す', () => {
      const url = JapanNewsFetcher.getDefaultFeedUrl();

      expect(url).toContain('news.google.com');
      expect(url).toContain('hl=ja');
      expect(url).toContain('gl=JP');
      expect(url).toContain('ceid=JP:ja');
    });
  });
});
