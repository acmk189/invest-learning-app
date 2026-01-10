/**
 * Supabaseクライアント初期化のテスト
 *
 * Task 3.2: Supabaseクライアント初期化テスト
 * Task 3.3: ヘルスチェック機能テスト
 * TDD: RED → GREEN → REFACTOR
 */

import {
  getSupabase,
  resetSupabaseClient,
  validateSupabaseConfig,
  healthCheck,
} from '../supabase';
import { getSupabaseEnvConfig } from '../envConfig';

// 環境変数のモック
const mockEnvConfig = {
  url: 'https://test-project.supabase.co',
  secretKey: 'sb_secret_test_key',
  publishableKey: 'sb_publishable_test_key',
};

// getSupabaseEnvConfigをモック
jest.mock('../envConfig', () => ({
  ...jest.requireActual('../envConfig'),
  getSupabaseEnvConfig: jest.fn(),
}));

describe('Supabase Client', () => {
  const mockedGetSupabaseEnvConfig = getSupabaseEnvConfig as jest.Mock;

  beforeEach(() => {
    // 各テスト前にクライアントをリセット
    resetSupabaseClient();
    // モックをリセット
    mockedGetSupabaseEnvConfig.mockReset();
    mockedGetSupabaseEnvConfig.mockReturnValue(mockEnvConfig);
  });

  afterEach(() => {
    resetSupabaseClient();
  });

  describe('getSupabase', () => {
    it('should return a Supabase client instance', () => {
      const client = getSupabase();

      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });

    it('should return the same instance on multiple calls (singleton pattern)', () => {
      const client1 = getSupabase();
      const client2 = getSupabase();

      expect(client1).toBe(client2);
    });

    it('should throw an error when environment config is missing', () => {
      mockedGetSupabaseEnvConfig.mockImplementation(() => {
        throw new Error('Supabase環境変数が不足しています: SUPABASE_URL');
      });

      expect(() => getSupabase()).toThrow('Supabase環境変数が不足しています');
    });
  });

  describe('validateSupabaseConfig', () => {
    it('should return valid result for correct configuration', () => {
      const result = validateSupabaseConfig();

      expect(result.isValid).toBe(true);
      expect(result.url).toBe(mockEnvConfig.url);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid result when URL is missing', () => {
      mockedGetSupabaseEnvConfig.mockImplementation(() => {
        throw new Error('Supabase環境変数が不足しています: SUPABASE_URL');
      });

      const result = validateSupabaseConfig();

      expect(result.isValid).toBe(false);
      expect(result.url).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should return invalid result when secret key is missing', () => {
      mockedGetSupabaseEnvConfig.mockImplementation(() => {
        throw new Error('Supabase環境変数が不足しています: SUPABASE_SECRET_KEY');
      });

      const result = validateSupabaseConfig();

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('SUPABASE_SECRET_KEY');
    });
  });

  describe('resetSupabaseClient', () => {
    it('should allow creating a new client after reset', () => {
      const client1 = getSupabase();
      resetSupabaseClient();

      // モック設定を更新
      const newEnvConfig = {
        url: 'https://different-project.supabase.co',
        secretKey: 'sb_secret_different_key',
      };
      mockedGetSupabaseEnvConfig.mockReturnValue(newEnvConfig);

      const client2 = getSupabase();

      // 新しいインスタンスが作成されている（オブジェクト参照が異なる）
      expect(client1).not.toBe(client2);
    });
  });

  describe('healthCheck', () => {
    it('should be a function', () => {
      expect(typeof healthCheck).toBe('function');
    });

    it('should return a promise', () => {
      const result = healthCheck();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should return false when connection fails', async () => {
      // モックのSupabaseクライアントはネットワーク接続できないためfalseが返る
      const result = await healthCheck();
      expect(result).toBe(false);
    });
  });
});
