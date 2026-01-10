/**
 * ニュースバッチサービスのテスト
 *
 * Task 8: ニュースバッチ処理
 * Task 5: Supabase移行 (migration-to-supabase)
 * - 5.1 NewsBatchService Supabase対応
 * - 5.2 ニュースメタデータ更新処理
 * - 5.3 ニュースバッチエラーハンドリング更新
 * - 5.4 ニュースバッチテスト更新
 *
 * Requirements:
 * - 1.1 (毎日8:00にニュース取得)
 * - 1.2, 1.3 (世界・日本ニュース取得)
 * - 1.4, 1.5 (翻訳+要約)
 * - 1.6 (Supabase保存)
 * - 1.8 (5分以内に完了)
 */

import {
  NewsBatchService,
  NewsBatchServiceConfig,
  NewsBatchError,
} from '../newsBatchService';
import { WorldNewsFetcher } from '../../fetchers/worldNewsFetcher';
import { JapanNewsFetcher } from '../../fetchers/japanNewsFetcher';
import { NewsSummaryService, SummaryResult } from '../../summarization';
import { NewsApiArticle } from '../../fetchers/newsApiTypes';
import { GoogleNewsRssItem } from '../../fetchers/rssTypes';

// モック設定
jest.mock('../../fetchers/worldNewsFetcher');
jest.mock('../../fetchers/japanNewsFetcher');
jest.mock('../../summarization');

// Supabaseクライアントのモック
const mockSupabaseFrom = jest.fn();
const mockSupabaseUpsert = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseSingle = jest.fn();

const mockSupabaseClient = {
  from: mockSupabaseFrom,
};

// チェーンメソッドの設定
mockSupabaseFrom.mockImplementation(() => ({
  upsert: mockSupabaseUpsert,
  update: mockSupabaseUpdate,
  select: mockSupabaseSelect,
}));

mockSupabaseUpsert.mockImplementation(() => ({
  select: mockSupabaseSelect,
}));

mockSupabaseUpdate.mockImplementation(() => ({
  eq: mockSupabaseEq,
}));

mockSupabaseEq.mockImplementation(() => ({
  select: mockSupabaseSelect,
}));

mockSupabaseSelect.mockImplementation(() => ({
  single: mockSupabaseSingle,
}));

// デフォルトで成功を返す
mockSupabaseSingle.mockResolvedValue({ data: { id: 1 }, error: null });

jest.mock('../../../../config/supabase', () => ({
  getSupabase: () => mockSupabaseClient,
}));

describe('NewsBatchService', () => {
  let service: NewsBatchService;
  let mockWorldNewsFetcher: jest.Mocked<WorldNewsFetcher>;
  let mockJapanNewsFetcher: jest.Mocked<JapanNewsFetcher>;
  let mockSummaryService: jest.Mocked<NewsSummaryService>;

  // サンプルデータ
  const sampleWorldArticles: NewsApiArticle[] = [
    {
      source: { id: 'reuters', name: 'Reuters' },
      author: 'John Doe',
      title: 'Stock Market Hits Record High',
      description: 'The stock market reached new highs today.',
      url: 'https://example.com/article1',
      urlToImage: 'https://example.com/image1.jpg',
      publishedAt: '2026-01-02T10:00:00Z',
      content: 'Investors are optimistic about the economy.',
    },
    {
      source: { id: 'bbc', name: 'BBC' },
      author: 'Jane Smith',
      title: 'Federal Reserve Announces New Policy',
      description: 'The Fed announced interest rate decisions.',
      url: 'https://example.com/article2',
      urlToImage: 'https://example.com/image2.jpg',
      publishedAt: '2026-01-02T09:00:00Z',
      content: 'The decision impacts global markets.',
    },
  ];

  const sampleJapanItems: GoogleNewsRssItem[] = [
    {
      title: '日経平均株価が上昇',
      link: 'https://example.com/japan-news1',
      publishedAt: '2026-01-02T10:00:00Z',
      description: '日経平均株価は前日比上昇しました。',
      source: '日本経済新聞',
    },
    {
      title: '円安が進行',
      link: 'https://example.com/japan-news2',
      publishedAt: '2026-01-02T09:00:00Z',
      description: '為替市場で円安が進んでいます。',
      source: '朝日新聞',
    },
  ];

  // 有効な要約文(2000文字)
  const validSummary = 'あ'.repeat(2000);

  const createMockSummaryResult = (summary: string): SummaryResult => ({
    summary,
    characterCount: summary.length,
    isValid: summary.length >= 1800 && summary.length <= 2200,
    model: 'claude-haiku-4-5',
    inputTokens: 500,
    outputTokens: 200,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Supabaseモックのリセット
    mockSupabaseFrom.mockImplementation(() => ({
      upsert: mockSupabaseUpsert,
      update: mockSupabaseUpdate,
      select: mockSupabaseSelect,
    }));
    mockSupabaseUpsert.mockImplementation(() => ({
      select: mockSupabaseSelect,
    }));
    mockSupabaseUpdate.mockImplementation(() => ({
      eq: mockSupabaseEq,
    }));
    mockSupabaseEq.mockImplementation(() => ({
      select: mockSupabaseSelect,
    }));
    mockSupabaseSelect.mockImplementation(() => ({
      single: mockSupabaseSingle,
    }));
    mockSupabaseSingle.mockResolvedValue({ data: { id: 1 }, error: null });

    // WorldNewsFetcherのモック
    mockWorldNewsFetcher = {
      fetchTopHeadlines: jest.fn().mockResolvedValue({
        status: 'ok',
        totalResults: 2,
        articles: sampleWorldArticles,
      }),
      getDailyRequestLimit: jest.fn().mockReturnValue(100),
      getRequestUsage: jest.fn().mockReturnValue({
        requestCount: 0,
        lastRequestAt: null,
        date: '2026-01-02',
      }),
      isNearDailyLimit: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<WorldNewsFetcher>;

    // JapanNewsFetcherのモック
    mockJapanNewsFetcher = {
      fetchJapanNews: jest.fn().mockResolvedValue({
        title: 'Google News - Business',
        link: 'https://news.google.com',
        items: sampleJapanItems,
      }),
      getConfig: jest.fn().mockReturnValue({
        feedUrl: 'https://news.google.com/rss',
        timeoutMs: 30000,
        maxItems: 10,
      }),
    } as unknown as jest.Mocked<JapanNewsFetcher>;

    // NewsSummaryServiceのモック
    mockSummaryService = {
      summarizeEnglishNews: jest
        .fn()
        .mockResolvedValue(createMockSummaryResult(validSummary)),
      summarizeJapaneseNews: jest
        .fn()
        .mockResolvedValue(createMockSummaryResult(validSummary)),
      getConfig: jest.fn().mockReturnValue({ maxRetries: 3, logErrors: true }),
    } as unknown as jest.Mocked<NewsSummaryService>;

    // サービスインスタンスを作成
    service = new NewsBatchService(
      mockWorldNewsFetcher,
      mockJapanNewsFetcher,
      mockSummaryService
    );
  });

  describe('NewsBatchServiceConfig', () => {
    it('デフォルト設定でサービスを初期化できる', () => {
      const config = service.getConfig();

      expect(config.timeoutMs).toBe(300000); // 5分
      expect(config.saveToDatabase).toBe(true);
    });

    it('カスタム設定でサービスを初期化できる', () => {
      const customConfig: NewsBatchServiceConfig = {
        timeoutMs: 180000, // 3分
        saveToDatabase: false,
      };
      const customService = new NewsBatchService(
        mockWorldNewsFetcher,
        mockJapanNewsFetcher,
        mockSummaryService,
        customConfig
      );
      const config = customService.getConfig();

      expect(config.timeoutMs).toBe(180000);
      expect(config.saveToDatabase).toBe(false);
    });
  });

  describe('8.2 並列ニュース取得オーケストレーション', () => {
    it('世界と日本のニュースを並列で取得する', async () => {
      const result = await service.execute();

      expect(mockWorldNewsFetcher.fetchTopHeadlines).toHaveBeenCalledTimes(1);
      expect(mockJapanNewsFetcher.fetchJapanNews).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });

    it('businessカテゴリで世界ニュースを取得する', async () => {
      await service.execute();

      expect(mockWorldNewsFetcher.fetchTopHeadlines).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'business',
        })
      );
    });

    it('部分的な取得成功時も処理を継続する(世界ニュースのみ成功)', async () => {
      mockJapanNewsFetcher.fetchJapanNews.mockRejectedValue(
        new Error('RSS Error')
      );

      const result = await service.execute();

      expect(result.success).toBe(false);
      expect(result.partialSuccess).toBe(true);
      expect(result.worldNews).toBeDefined();
      expect(result.japanNews).toBeUndefined();
    });

    it('部分的な取得成功時も処理を継続する(日本ニュースのみ成功)', async () => {
      mockWorldNewsFetcher.fetchTopHeadlines.mockRejectedValue(
        new Error('API Error')
      );

      const result = await service.execute();

      expect(result.success).toBe(false);
      expect(result.partialSuccess).toBe(true);
      expect(result.worldNews).toBeUndefined();
      expect(result.japanNews).toBeDefined();
    });

    it('両方のニュース取得に失敗した場合はエラーを返す', async () => {
      mockWorldNewsFetcher.fetchTopHeadlines.mockRejectedValue(
        new Error('API Error')
      );
      mockJapanNewsFetcher.fetchJapanNews.mockRejectedValue(
        new Error('RSS Error')
      );

      const result = await service.execute();

      expect(result.success).toBe(false);
      expect(result.partialSuccess).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('8.3 AI要約処理統合', () => {
    it('世界ニュースをAIで翻訳+要約する', async () => {
      const result = await service.execute();

      expect(mockSummaryService.summarizeEnglishNews).toHaveBeenCalledTimes(1);
      expect(result.worldNews?.summary).toBe(validSummary);
    });

    it('日本ニュースをAIで要約する', async () => {
      const result = await service.execute();

      expect(mockSummaryService.summarizeJapaneseNews).toHaveBeenCalledTimes(1);
      expect(result.japanNews?.summary).toBe(validSummary);
    });

    it('要約結果の文字数が検証される', async () => {
      const result = await service.execute();

      expect(result.worldNews?.characterCount).toBe(2000);
      expect(result.japanNews?.characterCount).toBe(2000);
    });

    it('要約失敗時はエラー情報を含む結果を返す', async () => {
      mockSummaryService.summarizeEnglishNews.mockRejectedValue(
        new Error('Summary failed')
      );

      const result = await service.execute();

      expect(result.success).toBe(false);
      expect(result.partialSuccess).toBe(true);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'world-news-summary',
        })
      );
    });
  });

  describe('5.1 Supabaseニュース保存機能', () => {
    it('要約結果をSupabaseに保存する', async () => {
      await service.execute();

      expect(mockSupabaseFrom).toHaveBeenCalledWith('news');
      expect(mockSupabaseUpsert).toHaveBeenCalled();
    });

    it('日付をPKとしてupsertを実行する', async () => {
      const today = new Date().toISOString().split('T')[0];

      await service.execute();

      expect(mockSupabaseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          date: today,
        }),
        expect.objectContaining({
          onConflict: 'date',
        })
      );
    });

    it('保存するペイロードが正しい構造を持つ', async () => {
      await service.execute();

      const upsertCall = mockSupabaseUpsert.mock.calls[0][0];
      expect(upsertCall).toHaveProperty('date');
      expect(upsertCall).toHaveProperty('world_news_title');
      expect(upsertCall).toHaveProperty('world_news_summary');
      expect(upsertCall).toHaveProperty('japan_news_title');
      expect(upsertCall).toHaveProperty('japan_news_summary');
      expect(upsertCall).toHaveProperty('updated_at');
    });

    it('保存失敗時にエラーログを記録する', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Supabase Error', code: '23505' },
      });

      const result = await service.execute();

      expect(result.databaseSaved).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'database-save',
        })
      );
    });

    it('saveToDatabase=falseの場合は保存しない', async () => {
      const noSaveService = new NewsBatchService(
        mockWorldNewsFetcher,
        mockJapanNewsFetcher,
        mockSummaryService,
        { saveToDatabase: false }
      );

      await noSaveService.execute();

      expect(mockSupabaseFrom).not.toHaveBeenCalledWith('news');
    });
  });

  describe('5.2 ニュースメタデータ更新機能', () => {
    it('バッチ完了時にbatch_metadata.news_last_updatedを更新する', async () => {
      await service.execute();

      expect(mockSupabaseFrom).toHaveBeenCalledWith('batch_metadata');
      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });

    it('メタデータ更新にISO 8601タイムスタンプが含まれる', async () => {
      await service.execute();

      // updateの呼び出しを確認
      const updatePayload = mockSupabaseUpdate.mock.calls[0][0];
      expect(updatePayload).toHaveProperty('news_last_updated');
      // ISO 8601形式のタイムスタンプであることを確認
      expect(updatePayload.news_last_updated).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it('メタデータ更新失敗時はエラーログを記録するが処理は継続する', async () => {
      // news upsertは成功、metadata updateは失敗
      let callCount = 0;
      mockSupabaseSingle.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // news upsert成功
          return Promise.resolve({ data: { date: '2026-01-02' }, error: null });
        }
        // metadata update失敗
        return Promise.resolve({
          data: null,
          error: { message: 'Metadata Error', code: '42P01' },
        });
      });

      const result = await service.execute();

      expect(result.metadataUpdated).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'metadata-update',
        })
      );
    });
  });

  describe('8.6 ニュースバッチタイムアウト制御', () => {
    it('5分以内にバッチ処理が完了する', async () => {
      const startTime = Date.now();

      await service.execute();

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(300000); // 5分 = 300,000ms
    });

    it('タイムアウト時にエラーを返す', async () => {
      // タイムアウトをシミュレート
      const shortTimeoutService = new NewsBatchService(
        mockWorldNewsFetcher,
        mockJapanNewsFetcher,
        mockSummaryService,
        { timeoutMs: 1 } // 1ms
      );

      // 遅延を追加
      mockWorldNewsFetcher.fetchTopHeadlines.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  status: 'ok',
                  totalResults: 2,
                  articles: sampleWorldArticles,
                }),
              100
            )
          )
      );

      const result = await shortTimeoutService.execute();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'timeout',
        })
      );
    });

    it('処理時間をログに記録する', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.execute();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NewsBatchService]')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('NewsBatchResult型', () => {
    it('成功時の結果構造を持つ', async () => {
      const result = await service.execute();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('partialSuccess');
      expect(result).toHaveProperty('worldNews');
      expect(result).toHaveProperty('japanNews');
      expect(result).toHaveProperty('databaseSaved');
      expect(result).toHaveProperty('metadataUpdated');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result).toHaveProperty('date');
    });

    it('エラー発生時にerrors配列を持つ', async () => {
      mockWorldNewsFetcher.fetchTopHeadlines.mockRejectedValue(
        new Error('API Error')
      );

      const result = await service.execute();

      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('NewsBatchError', () => {
    it('エラー情報を保持する', () => {
      const error = new NewsBatchError(
        'Test error',
        'world-news-fetch',
        new Error('Original')
      );

      expect(error.message).toBe('Test error');
      expect(error.operation).toBe('world-news-fetch');
      expect(error.originalError).toBeDefined();
    });
  });

  describe('日付処理', () => {
    it('今日の日付をYYYY-MM-DD形式で取得する', async () => {
      const result = await service.execute();
      const today = new Date().toISOString().split('T')[0];

      expect(result.date).toBe(today);
    });
  });
});
