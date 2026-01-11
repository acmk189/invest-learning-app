/**
 * 環境変数管理テスト
 *
 * Task 30.1: 環境変数管理実装
 * Task 12: Firebase依存の完全削除 - Supabase対応
 * Requirements: 9.1, 9.2
 *
 * すべての必要な環境変数が正しく読み込まれ、検証されることをテストします。
 */

import {
  validateAllEnvVars,
  getEnvVarStatus,
  getSupabaseEnvConfig,
  isSupabaseConfigured,
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
      process.env.CLAUDE_API_KEY = 'sk-ant-test';
      process.env.NEWS_API_KEY = 'test-news-api-key';
      process.env.CRON_SECRET = 'test-cron-secret';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

      // Act
      const result = validateAllEnvVars();

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.missingVars).toHaveLength(0);
      expect(result.configuredVars).toHaveLength(5);
    });

    it('必須環境変数が欠けている場合、isValidがfalseになる', () => {
      // Arrange: 一部の環境変数のみ設定
      process.env.CLAUDE_API_KEY = 'sk-ant-test';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      // NEWS_API_KEY, CRON_SECRET, SUPABASE_SECRET_KEY は未設定

      // Act
      const result = validateAllEnvVars();

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.missingVars.length).toBeGreaterThan(0);
    });

    it('空文字列の環境変数は未設定として扱われる', () => {
      // Arrange
      process.env.CLAUDE_API_KEY = '';
      process.env.NEWS_API_KEY = 'test-news-api-key';
      process.env.CRON_SECRET = 'test-cron-secret';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

      // Act
      const result = validateAllEnvVars();

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.missingVars).toContain('CLAUDE_API_KEY');
    });

    it('空白のみの環境変数は未設定として扱われる', () => {
      // Arrange
      process.env.CLAUDE_API_KEY = '   '; // 空白のみ
      process.env.NEWS_API_KEY = 'test-news-api-key';
      process.env.CRON_SECRET = 'test-cron-secret';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

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
      process.env.CLAUDE_API_KEY = 'sk-ant-test';
      process.env.NEWS_API_KEY = 'test-news-api-key';
      process.env.CRON_SECRET = 'test-cron-secret';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

      // Act
      const status = getEnvVarStatus();

      // Assert
      expect(status.CLAUDE_API_KEY.isConfigured).toBe(true);
      expect(status.NEWS_API_KEY.isConfigured).toBe(true);
      expect(status.CRON_SECRET.isConfigured).toBe(true);
      expect(status.SUPABASE_URL.isConfigured).toBe(true);
      expect(status.SUPABASE_SECRET_KEY.isConfigured).toBe(true);
    });

    it('未設定の環境変数のステータスを正しく返す', () => {
      // Arrange: 環境変数をクリア
      delete process.env.CLAUDE_API_KEY;
      delete process.env.NEWS_API_KEY;
      delete process.env.CRON_SECRET;
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SECRET_KEY;

      // Act
      const status = getEnvVarStatus();

      // Assert
      expect(status.CLAUDE_API_KEY.isConfigured).toBe(false);
      expect(status.SUPABASE_URL.isConfigured).toBe(false);
      expect(status.SUPABASE_SECRET_KEY.isConfigured).toBe(false);
    });

    it('各環境変数の説明が含まれている', () => {
      // Act
      const status = getEnvVarStatus();

      // Assert
      expect(status.CLAUDE_API_KEY.description).toBeDefined();
      expect(status.NEWS_API_KEY.description).toBeDefined();
      expect(status.CRON_SECRET.description).toBeDefined();
      expect(status.SUPABASE_URL.description).toBeDefined();
      expect(status.SUPABASE_SECRET_KEY.description).toBeDefined();
    });
  });

  describe('ENV_VAR_CONFIG', () => {
    it('すべての必須環境変数が定義されている', () => {
      const expectedVars: EnvVarName[] = [
        'CLAUDE_API_KEY',
        'NEWS_API_KEY',
        'CRON_SECRET',
        'SUPABASE_URL',
        'SUPABASE_SECRET_KEY',
      ];

      expectedVars.forEach((varName) => {
        expect(ENV_VAR_CONFIG[varName]).toBeDefined();
        expect(ENV_VAR_CONFIG[varName].description).toBeDefined();
        expect(ENV_VAR_CONFIG[varName].required).toBe(true);
      });
    });

    it('オプション環境変数が定義されている', () => {
      const optionalVars: EnvVarName[] = [
        'SUPABASE_PUBLISHABLE_KEY',
        'LOCAL_SUPABASE_URL',
        'LOCAL_SUPABASE_PUBLISHABLE_KEY',
        'LOCAL_SUPABASE_SECRET_KEY',
      ];

      optionalVars.forEach((varName) => {
        expect(ENV_VAR_CONFIG[varName]).toBeDefined();
        expect(ENV_VAR_CONFIG[varName].description).toBeDefined();
        expect(ENV_VAR_CONFIG[varName].required).toBe(false);
      });
    });
  });

  describe('Supabase環境変数', () => {
    it('Supabase環境変数が設定マップに定義されている', () => {
      const supabaseVars: EnvVarName[] = [
        'SUPABASE_URL',
        'SUPABASE_PUBLISHABLE_KEY',
        'SUPABASE_SECRET_KEY',
      ];

      supabaseVars.forEach((varName) => {
        expect(ENV_VAR_CONFIG[varName]).toBeDefined();
        expect(ENV_VAR_CONFIG[varName].description).toBeDefined();
      });
    });

    it('Supabase環境変数が設定されている場合、検証に含まれる', () => {
      // Arrange: すべての環境変数を設定
      process.env.CLAUDE_API_KEY = 'sk-ant-test';
      process.env.NEWS_API_KEY = 'test-news-api-key';
      process.env.CRON_SECRET = 'test-cron-secret';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

      // Act
      const status = getEnvVarStatus();

      // Assert
      expect(status.SUPABASE_URL.isConfigured).toBe(true);
      expect(status.SUPABASE_PUBLISHABLE_KEY.isConfigured).toBe(true);
      expect(status.SUPABASE_SECRET_KEY.isConfigured).toBe(true);
    });

    it('ローカル開発用Supabase環境変数がオプションとして定義されている', () => {
      const localSupabaseVars: EnvVarName[] = [
        'LOCAL_SUPABASE_URL',
        'LOCAL_SUPABASE_PUBLISHABLE_KEY',
        'LOCAL_SUPABASE_SECRET_KEY',
      ];

      localSupabaseVars.forEach((varName) => {
        expect(ENV_VAR_CONFIG[varName]).toBeDefined();
        expect(ENV_VAR_CONFIG[varName].required).toBe(false);
      });
    });
  });

  describe('getSupabaseEnvConfig', () => {
    it('本番環境でSupabase環境変数を正しく取得する', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
      process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';

      // Act
      const config = getSupabaseEnvConfig();

      // Assert
      expect(config.url).toBe('https://test.supabase.co');
      expect(config.secretKey).toBe('sb_secret_test');
      expect(config.publishableKey).toBe('sb_publishable_test');
    });

    it('ローカル開発環境でローカルSupabase環境変数を優先する', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      process.env.LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
      process.env.LOCAL_SUPABASE_SECRET_KEY = 'sb_secret_local';
      process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_local';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

      // Act
      const config = getSupabaseEnvConfig();

      // Assert
      expect(config.url).toBe('http://127.0.0.1:54321');
      expect(config.secretKey).toBe('sb_secret_local');
      expect(config.publishableKey).toBe('sb_publishable_local');
    });

    it('ローカル環境変数がない場合は本番環境変数にフォールバック', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      delete process.env.LOCAL_SUPABASE_URL;
      delete process.env.LOCAL_SUPABASE_SECRET_KEY;
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

      // Act
      const config = getSupabaseEnvConfig();

      // Assert
      expect(config.url).toBe('https://test.supabase.co');
      expect(config.secretKey).toBe('sb_secret_test');
    });

    it('必要な環境変数がない場合エラーをスロー', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SECRET_KEY;

      // Act & Assert
      expect(() => getSupabaseEnvConfig()).toThrow(
        'Supabase環境変数が不足しています'
      );
    });
  });

  describe('isSupabaseConfigured', () => {
    it('本番環境でSupabase環境変数が設定されている場合true', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

      // Act & Assert
      expect(isSupabaseConfigured()).toBe(true);
    });

    it('ローカル環境でローカルSupabase環境変数が設定されている場合true', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      process.env.LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
      process.env.LOCAL_SUPABASE_SECRET_KEY = 'sb_secret_local';

      // Act & Assert
      expect(isSupabaseConfigured()).toBe(true);
    });

    it('環境変数が設定されていない場合false', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SECRET_KEY;
      delete process.env.LOCAL_SUPABASE_URL;
      delete process.env.LOCAL_SUPABASE_SECRET_KEY;

      // Act & Assert
      expect(isSupabaseConfigured()).toBe(false);
    });
  });
});
