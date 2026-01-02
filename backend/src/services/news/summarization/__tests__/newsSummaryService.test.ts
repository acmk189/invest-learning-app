/**
 * ニュース要約サービスのテスト
 * Task 4.5: 要約失敗時フォールバック処理
 *
 * Requirements: 1.7 (バッチ失敗時エラーログ+リトライ)
 */

import {
  NewsSummaryService,
  NewsSummaryServiceConfig,
  NewsSummaryError,
  SummaryResult,
} from '../newsSummaryService';
import { NewsArticle } from '../newsSummaryPrompt';
import { ClaudeClient, ClaudeResponse } from '../../../claudeClient';

// ClaudeClientのモック
jest.mock('../../../claudeClient', () => ({
  ClaudeClient: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn(),
    getDefaultModel: jest.fn().mockReturnValue('claude-haiku-4-5'),
    isInitialized: jest.fn().mockReturnValue(true),
  })),
  getClaudeClient: jest.fn(),
}));

describe('ニュース要約サービス', () => {
  let mockClient: jest.Mocked<ClaudeClient>;
  let service: NewsSummaryService;

  const sampleEnglishArticles: NewsArticle[] = [
    {
      title: 'Stock Market Hits Record High',
      description: 'The stock market reached new highs.',
      content: 'Investors are optimistic.',
      source: 'Financial Times',
      publishedAt: '2026-01-02T10:00:00Z',
    },
  ];

  const sampleJapaneseArticles: NewsArticle[] = [
    {
      title: '日経平均株価が上昇',
      description: '日経平均株価は前日比上昇。',
      content: '投資家の間で楽観論が広がっている。',
      source: '日本経済新聞',
      publishedAt: '2026-01-02T10:00:00Z',
    },
  ];

  // 有効な要約（2000文字）
  const validSummary = 'あ'.repeat(2000);

  const createMockResponse = (content: string): ClaudeResponse => ({
    content,
    usage: {
      inputTokens: 500,
      outputTokens: 200,
    },
    model: 'claude-haiku-4-5',
    stopReason: 'end_turn',
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      sendMessage: jest.fn().mockResolvedValue(createMockResponse(validSummary)),
      getDefaultModel: jest.fn().mockReturnValue('claude-haiku-4-5'),
      isInitialized: jest.fn().mockReturnValue(true),
      getInternalClient: jest.fn(),
    } as unknown as jest.Mocked<ClaudeClient>;

    service = new NewsSummaryService(mockClient);
  });

  describe('NewsSummaryServiceConfig', () => {
    it('デフォルト設定でサービスを初期化できる', () => {
      const defaultService = new NewsSummaryService(mockClient);
      const config = defaultService.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.logErrors).toBe(true);
    });

    it('カスタム設定でサービスを初期化できる', () => {
      const customConfig: NewsSummaryServiceConfig = {
        maxRetries: 5,
        logErrors: false,
      };
      const customService = new NewsSummaryService(mockClient, customConfig);
      const config = customService.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.logErrors).toBe(false);
    });
  });

  describe('summarizeEnglishNews', () => {
    it('英語ニュースを正常に要約する', async () => {
      const result = await service.summarizeEnglishNews(sampleEnglishArticles);

      expect(result.summary).toBe(validSummary);
      expect(result.characterCount).toBe(2000);
      expect(result.isValid).toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('送信されたプロンプトに翻訳指示が含まれる', async () => {
      await service.summarizeEnglishNews(sampleEnglishArticles);

      const calledPrompt = mockClient.sendMessage.mock.calls[0][0];
      expect(calledPrompt).toMatch(/翻訳/);
      expect(calledPrompt).toMatch(/日本語/);
    });

    it('要約結果にトークン使用量が含まれる', async () => {
      const result = await service.summarizeEnglishNews(sampleEnglishArticles);

      expect(result.inputTokens).toBe(500);
      expect(result.outputTokens).toBe(200);
    });
  });

  describe('summarizeJapaneseNews', () => {
    it('日本語ニュースを正常に要約する', async () => {
      const result = await service.summarizeJapaneseNews(sampleJapaneseArticles);

      expect(result.summary).toBe(validSummary);
      expect(result.characterCount).toBe(2000);
      expect(result.isValid).toBe(true);
    });

    it('送信されたプロンプトに記事タイトルが含まれる', async () => {
      await service.summarizeJapaneseNews(sampleJapaneseArticles);

      const calledPrompt = mockClient.sendMessage.mock.calls[0][0];
      expect(calledPrompt).toContain('日経平均株価が上昇');
    });
  });

  describe('リトライ処理', () => {
    it('失敗時にリトライする', async () => {
      mockClient.sendMessage
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(createMockResponse(validSummary));

      const result = await service.summarizeEnglishNews(sampleEnglishArticles);

      expect(result.summary).toBe(validSummary);
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('最大リトライ回数後に失敗する', async () => {
      mockClient.sendMessage.mockRejectedValue(new Error('Persistent API Error'));

      await expect(service.summarizeEnglishNews(sampleEnglishArticles)).rejects.toThrow(
        NewsSummaryError
      );

      // 初回 + 3回リトライ = 4回
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(4);
    });

    it('リトライ回数を設定できる', async () => {
      const customService = new NewsSummaryService(mockClient, { maxRetries: 2 });
      mockClient.sendMessage.mockRejectedValue(new Error('API Error'));

      await expect(customService.summarizeEnglishNews(sampleEnglishArticles)).rejects.toThrow();

      // 初回 + 2回リトライ = 3回
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('文字数検証とリトライ', () => {
    it('文字数が短すぎる場合は警告付きで返す（リトライしない）', async () => {
      const shortSummary = 'あ'.repeat(1500);
      mockClient.sendMessage.mockResolvedValue(createMockResponse(shortSummary));

      const result = await service.summarizeEnglishNews(sampleEnglishArticles);

      expect(result.isValid).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning).toMatch(/文字/);
      // 文字数チェック失敗でもリトライしない（APIは成功している）
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('文字数が長すぎる場合は警告付きで返す（リトライしない）', async () => {
      const longSummary = 'あ'.repeat(2500);
      mockClient.sendMessage.mockResolvedValue(createMockResponse(longSummary));

      const result = await service.summarizeEnglishNews(sampleEnglishArticles);

      expect(result.isValid).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning).toMatch(/文字/);
    });
  });

  describe('NewsSummaryError', () => {
    it('エラー情報を保持する', async () => {
      const error = new Error('Test error');
      mockClient.sendMessage.mockRejectedValue(error);

      try {
        await service.summarizeEnglishNews(sampleEnglishArticles);
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(NewsSummaryError);
        const summaryError = e as NewsSummaryError;
        expect(summaryError.message).toContain('要約');
        expect(summaryError.operation).toBe('english-news-summary');
      }
    });

    it('日本語ニュースの場合は適切な操作名を持つ', async () => {
      mockClient.sendMessage.mockRejectedValue(new Error('API Error'));

      try {
        await service.summarizeJapaneseNews(sampleJapaneseArticles);
        fail('Should have thrown');
      } catch (e) {
        const summaryError = e as NewsSummaryError;
        expect(summaryError.operation).toBe('japanese-news-summary');
      }
    });
  });

  describe('SummaryResult型', () => {
    it('結果の基本構造を持つ', async () => {
      const result = await service.summarizeEnglishNews(sampleEnglishArticles);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('characterCount');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('inputTokens');
      expect(result).toHaveProperty('outputTokens');
    });
  });
});
