/**
 * Supabase クライアント テスト
 * Task 8.2, 8.3: Supabaseクライアント初期化、接続テスト機能
 *
 * Requirements: 7
 */

import {
  SupabaseClient,
  getDefaultSupabaseClient,
  isSupabaseInitialized,
  initializeSupabaseClient,
  getSupabaseInstance,
  resetSupabaseClient,
} from '../client';
import { DEFAULT_SUPABASE_CLIENT_CONFIG } from '../types';

// Supabase SDKのモック
// createClientは実際のSupabaseクライアントを生成するため、テストではモック化
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();

const mockSupabaseClient = {
  from: mockFrom,
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('SupabaseClient', () => {
  let client: SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // モックチェーンのセットアップ
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: { id: 1 }, error: null });

    client = new SupabaseClient();
    resetSupabaseClient();
  });

  describe('initialize', () => {
    it('デフォルト設定で初期化できること', async () => {
      await client.initialize({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
      });

      expect(client.isInitialized()).toBe(true);
    });

    it('カスタム設定で初期化できること', async () => {
      const customConfig = {
        url: 'https://custom.supabase.co',
        anonKey: 'custom-anon-key',
        connectionTimeout: 5000,
      };

      await client.initialize(customConfig);

      const config = client.getConfig();
      expect(config.connectionTimeout).toBe(5000);
    });

    it('URL未設定時にエラーをスローすること', async () => {
      await expect(
        client.initialize({
          url: '',
          anonKey: 'test-key',
        })
      ).rejects.toThrow('SUPABASE_URL');
    });

    it('anon key未設定時にエラーをスローすること', async () => {
      await expect(
        client.initialize({
          url: 'https://test.supabase.co',
          anonKey: '',
        })
      ).rejects.toThrow('SUPABASE_ANON_KEY');
    });

    it('二重初期化を防止すること', async () => {
      await client.initialize({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
      });
      // 二回目は何もしない
      await client.initialize({
        url: 'https://test2.supabase.co',
        anonKey: 'test2-anon-key',
      });

      // 最初の設定が維持されている
      const config = client.getConfig();
      expect(config.url).toBe('https://test.supabase.co');
    });
  });

  describe('isInitialized', () => {
    it('初期化前はfalseを返すこと', () => {
      expect(client.isInitialized()).toBe(false);
    });

    it('初期化後はtrueを返すこと', async () => {
      await client.initialize({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
      });
      expect(client.isInitialized()).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('デフォルト設定を返すこと', () => {
      const config = client.getConfig();
      expect(config.connectionTimeout).toBe(DEFAULT_SUPABASE_CLIENT_CONFIG.connectionTimeout);
    });

    it('カスタム設定を返すこと', async () => {
      await client.initialize({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
        connectionTimeout: 15000,
      });
      const config = client.getConfig();

      expect(config.connectionTimeout).toBe(15000);
    });
  });

  describe('getClient', () => {
    it('初期化前にエラーをスローすること', () => {
      expect(() => client.getClient()).toThrow('Supabase client is not initialized');
    });

    it('初期化後にクライアントを返すこと', async () => {
      await client.initialize({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
      });

      const supabaseClient = client.getClient();
      expect(supabaseClient).toBeDefined();
    });
  });
});

describe('getDefaultSupabaseClient', () => {
  beforeEach(() => {
    resetSupabaseClient();
  });

  it('シングルトンインスタンスを返すこと', () => {
    const client1 = getDefaultSupabaseClient();
    const client2 = getDefaultSupabaseClient();

    expect(client1).toBe(client2);
  });
});

describe('isSupabaseInitialized', () => {
  beforeEach(() => {
    resetSupabaseClient();
  });

  it('初期化前はfalseを返すこと', () => {
    expect(isSupabaseInitialized()).toBe(false);
  });
});

describe('initializeSupabaseClient', () => {
  beforeEach(() => {
    resetSupabaseClient();
  });

  it('デフォルトクライアントを初期化できること', async () => {
    await initializeSupabaseClient({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
    });

    expect(isSupabaseInitialized()).toBe(true);
  });
});

describe('getSupabaseInstance', () => {
  beforeEach(() => {
    resetSupabaseClient();
  });

  it('初期化後にインスタンスを取得できること', async () => {
    await initializeSupabaseClient({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
    });

    const instance = getSupabaseInstance();
    expect(instance).toBeDefined();
  });
});
