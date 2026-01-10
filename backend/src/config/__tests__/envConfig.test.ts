/**
 * 環境変数管理テスト
 *
 * Task 30.1: 環境変数管理実装
 * Requirements: 9.1, 9.2
 *
 * すべての必要な環境変数が正しく読み込まれ、検証されることをテストします。
 */

import {
  validateAllEnvVars,
  getEnvVarStatus,
  type EnvVarName,
  ENV_VAR_CONFIG,
} from '../envConfig';

describe('envConfig', () => {
  // テスト用の環境変数バックアップ
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // テスト前に環境変数をクリア
    jest.resetModules();
  });

  afterEach(() => {
    // テスト後に環境変数を復元
    process.env = { ...originalEnv };
  });

  describe('validateAllEnvVars', () => {
    it('すべての必須環境変数が設定されている場合、isValidがtrueになる', () => {
      // Arrange: すべての必須環境変数を設定
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
      process.env.CLAUDE_API_KEY = 'sk-ant-test';
      process.env.NEWS_API_KEY = 'test-news-api-key';
      process.env.CRON_SECRET = 'test-cron-secret';

      // Act
      const result = validateAllEnvVars();

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.missingVars).toHaveLength(0);
      expect(result.configuredVars).toHaveLength(6);
    });

    it('必須環境変数が欠けている場合、isValidがfalseになる', () => {
      // Arrange: 一部の環境変数のみ設定
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.CLAUDE_API_KEY = 'sk-ant-test';
      // FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEWS_API_KEY, CRON_SECRET は未設定

      // Act
      const result = validateAllEnvVars();

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.missingVars.length).toBeGreaterThan(0);
    });

    it('空文字列の環境変数は未設定として扱われる', () => {
      // Arrange
      process.env.FIREBASE_PROJECT_ID = '';
      process.env.FIREBASE_PRIVATE_KEY = 'test-key';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
      process.env.CLAUDE_API_KEY = 'sk-ant-test';
      process.env.NEWS_API_KEY = 'test-news-api-key';
      process.env.CRON_SECRET = 'test-cron-secret';

      // Act
      const result = validateAllEnvVars();

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.missingVars).toContain('FIREBASE_PROJECT_ID');
    });

    it('空白のみの環境変数は未設定として扱われる', () => {
      // Arrange
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_PRIVATE_KEY = 'test-key';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
      process.env.CLAUDE_API_KEY = '   '; // 空白のみ
      process.env.NEWS_API_KEY = 'test-news-api-key';
      process.env.CRON_SECRET = 'test-cron-secret';

      // Act
      const result = validateAllEnvVars();

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.missingVars).toContain('CLAUDE_API_KEY');
    });
  });

  describe('getEnvVarStatus', () => {
    it('設定されている環境変数のステータスを正しく返す', () => {
      // Arrange
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_PRIVATE_KEY = 'test-key';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
      process.env.CLAUDE_API_KEY = 'sk-ant-test';
      process.env.NEWS_API_KEY = 'test-news-api-key';
      process.env.CRON_SECRET = 'test-cron-secret';

      // Act
      const status = getEnvVarStatus();

      // Assert
      expect(status.FIREBASE_PROJECT_ID.isConfigured).toBe(true);
      expect(status.CLAUDE_API_KEY.isConfigured).toBe(true);
      expect(status.NEWS_API_KEY.isConfigured).toBe(true);
      expect(status.CRON_SECRET.isConfigured).toBe(true);
    });

    it('未設定の環境変数のステータスを正しく返す', () => {
      // Arrange: 環境変数をクリア
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_PRIVATE_KEY;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.CLAUDE_API_KEY;
      delete process.env.NEWS_API_KEY;
      delete process.env.CRON_SECRET;

      // Act
      const status = getEnvVarStatus();

      // Assert
      expect(status.FIREBASE_PROJECT_ID.isConfigured).toBe(false);
      expect(status.CLAUDE_API_KEY.isConfigured).toBe(false);
    });

    it('各環境変数の説明が含まれている', () => {
      // Act
      const status = getEnvVarStatus();

      // Assert
      expect(status.FIREBASE_PROJECT_ID.description).toBeDefined();
      expect(status.CLAUDE_API_KEY.description).toBeDefined();
      expect(status.NEWS_API_KEY.description).toBeDefined();
      expect(status.CRON_SECRET.description).toBeDefined();
    });
  });

  describe('ENV_VAR_CONFIG', () => {
    it('すべての必須環境変数が定義されている', () => {
      const expectedVars: EnvVarName[] = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'CLAUDE_API_KEY',
        'NEWS_API_KEY',
        'CRON_SECRET',
      ];

      expectedVars.forEach((varName) => {
        expect(ENV_VAR_CONFIG[varName]).toBeDefined();
        expect(ENV_VAR_CONFIG[varName].description).toBeDefined();
        expect(ENV_VAR_CONFIG[varName].required).toBe(true);
      });
    });
  });
});
