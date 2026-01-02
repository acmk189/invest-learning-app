/**
 * NewsAPIクライアント導入と設定のテスト
 *
 * Task 6.1: NewsAPIクライアント導入と設定
 * Requirements: 1.2 (NewsAPIから世界のニュース取得)
 *
 * NewsAPI v2クライアントライブラリの初期化とAPIキー読み込みのテスト
 *
 * @see https://newsapi.org/docs/get-started - NewsAPI ドキュメント
 */

import {
  NewsApiClient,
  NewsApiKeyError,
  getNewsApiKey,
  validateNewsApiKey,
} from '../newsApiClient';

describe('NewsAPIクライアント導入と設定', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };
    delete process.env.NEWS_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getNewsApiKey', () => {
    it('環境変数NEWS_API_KEYが設定されている場合、APIキーを返す', () => {
      // Arrange
      const testApiKey = 'test-news-api-key-12345';
      process.env.NEWS_API_KEY = testApiKey;

      // Act
      const result = getNewsApiKey();

      // Assert
      expect(result).toBe(testApiKey);
    });

    it('環境変数が未設定の場合、NewsApiKeyErrorをスローする', () => {
      // Arrange
      delete process.env.NEWS_API_KEY;

      // Act & Assert
      expect(() => getNewsApiKey()).toThrow(NewsApiKeyError);
      expect(() => getNewsApiKey()).toThrow(
        'NEWS_API_KEY環境変数が設定されていません'
      );
    });

    it('環境変数が空文字の場合、NewsApiKeyErrorをスローする', () => {
      // Arrange
      process.env.NEWS_API_KEY = '';

      // Act & Assert
      expect(() => getNewsApiKey()).toThrow(NewsApiKeyError);
    });

    it('環境変数が空白のみの場合、NewsApiKeyErrorをスローする', () => {
      // Arrange
      process.env.NEWS_API_KEY = '   ';

      // Act & Assert
      expect(() => getNewsApiKey()).toThrow(NewsApiKeyError);
    });
  });

  describe('validateNewsApiKey', () => {
    it('有効なAPIキーの場合、trueを返す', () => {
      // Arrange
      const validApiKey = 'valid-api-key';

      // Act
      const result = validateNewsApiKey(validApiKey);

      // Assert
      expect(result).toBe(true);
    });

    it('空のAPIキーの場合、falseを返す', () => {
      // Arrange
      const emptyApiKey = '';

      // Act
      const result = validateNewsApiKey(emptyApiKey);

      // Assert
      expect(result).toBe(false);
    });

    it('空白のみのAPIキーの場合、falseを返す', () => {
      // Arrange
      const whitespaceApiKey = '   ';

      // Act
      const result = validateNewsApiKey(whitespaceApiKey);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('NewsApiClient', () => {
    it('APIキーを指定して初期化できる', () => {
      // Arrange
      const apiKey = 'test-api-key';

      // Act
      const client = new NewsApiClient({ apiKey });

      // Assert
      expect(client).toBeInstanceOf(NewsApiClient);
    });

    it('環境変数からAPIキーを自動で読み込んで初期化できる', () => {
      // Arrange
      process.env.NEWS_API_KEY = 'env-api-key';

      // Act
      const client = new NewsApiClient();

      // Assert
      expect(client).toBeInstanceOf(NewsApiClient);
    });

    it('APIキー未指定かつ環境変数未設定の場合、エラーをスローする', () => {
      // Arrange
      delete process.env.NEWS_API_KEY;

      // Act & Assert
      expect(() => new NewsApiClient()).toThrow(NewsApiKeyError);
    });

    it('getBaseUrl()はNewsAPIのベースURLを返す', () => {
      // Arrange
      const client = new NewsApiClient({ apiKey: 'test-key' });

      // Act
      const baseUrl = client.getBaseUrl();

      // Assert
      expect(baseUrl).toBe('https://newsapi.org/v2');
    });

    it('getConfig()は設定情報を返す', () => {
      // Arrange
      const client = new NewsApiClient({
        apiKey: 'test-key',
        timeoutMs: 15000,
      });

      // Act
      const config = client.getConfig();

      // Assert
      expect(config.timeoutMs).toBe(15000);
      // APIキーは隠蔽される
      expect(config.apiKeyConfigured).toBe(true);
    });

    it('デフォルトのタイムアウトは10秒', () => {
      // Arrange
      const client = new NewsApiClient({ apiKey: 'test-key' });

      // Act
      const config = client.getConfig();

      // Assert
      expect(config.timeoutMs).toBe(10000);
    });
  });

  describe('NewsApiKeyError', () => {
    it('正しいエラーメッセージを持つ', () => {
      // Arrange
      const errorMessage = 'Test error message';

      // Act
      const error = new NewsApiKeyError(errorMessage);

      // Assert
      expect(error.message).toBe(errorMessage);
      expect(error.name).toBe('NewsApiKeyError');
    });

    it('Errorクラスを継承している', () => {
      // Act
      const error = new NewsApiKeyError('Test');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NewsApiKeyError);
    });
  });
});
