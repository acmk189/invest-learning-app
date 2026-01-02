/**
 * APIキー環境変数読み込みとHTTPS接続設定のテスト
 *
 * Requirements: 9.1, 9.3, 9.4
 *
 * - APIキーを環境変数から安全に読み込む機能のテスト
 * - HTTPS通信設定の確認テスト
 * - APIキー未設定時のエラーハンドリングテスト
 *
 * @see https://docs.anthropic.com/en/api/getting-started - Anthropic API ドキュメント
 */

import {
  getApiKey,
  validateApiKey,
  getApiBaseUrl,
  isHttpsEnabled,
  ApiKeyError,
} from '../apiKeyConfig';

describe('APIキー環境変数読み込みとHTTPS接続設定', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };
    delete process.env.CLAUDE_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getApiKey', () => {
    it('環境変数CLAUDE_API_KEYが設定されている場合、APIキーを返す', () => {
      // Arrange
      const testApiKey = 'sk-ant-api03-valid-test-key-12345';
      process.env.CLAUDE_API_KEY = testApiKey;

      // Act
      const result = getApiKey();

      // Assert
      expect(result).toBe(testApiKey);
    });

    it('環境変数が未設定の場合、ApiKeyErrorをスローする', () => {
      // Arrange
      delete process.env.CLAUDE_API_KEY;

      // Act & Assert
      expect(() => getApiKey()).toThrow(ApiKeyError);
      expect(() => getApiKey()).toThrow('CLAUDE_API_KEY環境変数が設定されていません');
    });

    it('環境変数が空文字の場合、ApiKeyErrorをスローする', () => {
      // Arrange
      process.env.CLAUDE_API_KEY = '';

      // Act & Assert
      expect(() => getApiKey()).toThrow(ApiKeyError);
      expect(() => getApiKey()).toThrow('CLAUDE_API_KEY環境変数が設定されていません');
    });

    it('環境変数が空白のみの場合、ApiKeyErrorをスローする', () => {
      // Arrange
      process.env.CLAUDE_API_KEY = '   ';

      // Act & Assert
      expect(() => getApiKey()).toThrow(ApiKeyError);
      expect(() => getApiKey()).toThrow('CLAUDE_API_KEY環境変数が設定されていません');
    });
  });

  describe('validateApiKey', () => {
    it('有効なAPIキー形式の場合、trueを返す', () => {
      // Arrange
      const validApiKey = 'sk-ant-api03-valid-test-key';

      // Act
      const result = validateApiKey(validApiKey);

      // Assert
      expect(result).toBe(true);
    });

    it('空のAPIキーの場合、falseを返す', () => {
      // Arrange
      const emptyApiKey = '';

      // Act
      const result = validateApiKey(emptyApiKey);

      // Assert
      expect(result).toBe(false);
    });

    it('空白のみのAPIキーの場合、falseを返す', () => {
      // Arrange
      const whitespaceApiKey = '   ';

      // Act
      const result = validateApiKey(whitespaceApiKey);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getApiBaseUrl', () => {
    it('Anthropic APIのベースURLを返す', () => {
      // Act
      const result = getApiBaseUrl();

      // Assert
      expect(result).toBe('https://api.anthropic.com');
    });

    it('返されるURLはHTTPSで始まる', () => {
      // Act
      const result = getApiBaseUrl();

      // Assert
      expect(result.startsWith('https://')).toBe(true);
    });
  });

  describe('isHttpsEnabled', () => {
    it('HTTPS通信が有効であることを確認する', () => {
      // Act
      const result = isHttpsEnabled();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('ApiKeyError', () => {
    it('正しいエラーメッセージを持つ', () => {
      // Arrange
      const errorMessage = 'Test error message';

      // Act
      const error = new ApiKeyError(errorMessage);

      // Assert
      expect(error.message).toBe(errorMessage);
      expect(error.name).toBe('ApiKeyError');
    });

    it('Errorクラスを継承している', () => {
      // Act
      const error = new ApiKeyError('Test');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiKeyError);
    });
  });
});
