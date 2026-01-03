/**
 * Firestore クライアント テスト
 * Task 14.1, 14.3: Firestore接続初期化、オフライン永続化設定
 *
 * Requirements: 12.3, 2.5
 */

import {
  FirestoreClient,
  getDefaultFirestoreClient,
  isFirestoreInitialized,
} from '../client';
import { DEFAULT_FIRESTORE_CLIENT_CONFIG } from '../types';

// モック設定
const mockSettings = jest.fn().mockResolvedValue(undefined);
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockGet = jest.fn();

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = jest.fn(() => ({
    settings: mockSettings,
    collection: mockCollection,
  }));

  return {
    __esModule: true,
    default: mockFirestore,
  };
});

describe('FirestoreClient', () => {
  let client: FirestoreClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({
      doc: mockDoc,
    });
    mockDoc.mockReturnValue({
      get: mockGet,
    });
    client = new FirestoreClient();
  });

  describe('initialize', () => {
    it('デフォルト設定で初期化できること', async () => {
      await client.initialize();

      expect(mockSettings).toHaveBeenCalledWith({
        persistence: DEFAULT_FIRESTORE_CLIENT_CONFIG.persistence,
        cacheSizeBytes: DEFAULT_FIRESTORE_CLIENT_CONFIG.cacheSizeBytes,
      });
    });

    it('カスタム設定で初期化できること', async () => {
      const customConfig = {
        persistence: false,
        cacheSizeBytes: 50 * 1024 * 1024,
        connectionTimeout: 5000,
      };

      await client.initialize(customConfig);

      expect(mockSettings).toHaveBeenCalledWith({
        persistence: false,
        cacheSizeBytes: 50 * 1024 * 1024,
      });
    });

    it('初期化失敗時にFirestoreErrorをスローすること', async () => {
      mockSettings.mockRejectedValueOnce(new Error('Init failed'));

      await expect(client.initialize()).rejects.toThrow();
    });

    it('二重初期化を防止すること', async () => {
      await client.initialize();
      await client.initialize(); // 二回目は何もしない

      expect(mockSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('isInitialized', () => {
    it('初期化前はfalseを返すこと', () => {
      expect(client.isInitialized()).toBe(false);
    });

    it('初期化後はtrueを返すこと', async () => {
      await client.initialize();
      expect(client.isInitialized()).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('デフォルト設定を返すこと', () => {
      const config = client.getConfig();
      expect(config).toEqual(DEFAULT_FIRESTORE_CLIENT_CONFIG);
    });

    it('カスタム設定を返すこと', async () => {
      const customConfig = {
        persistence: false,
        cacheSizeBytes: 50 * 1024 * 1024,
        connectionTimeout: 5000,
      };

      await client.initialize(customConfig);
      const config = client.getConfig();

      expect(config).toEqual(customConfig);
    });
  });
});

describe('getDefaultFirestoreClient', () => {
  it('シングルトンインスタンスを返すこと', () => {
    const client1 = getDefaultFirestoreClient();
    const client2 = getDefaultFirestoreClient();

    expect(client1).toBe(client2);
  });
});

describe('isFirestoreInitialized', () => {
  it('デフォルトクライアントの初期化状態を返すこと', async () => {
    // 新しいクライアントを作成して初期化状態をテスト
    // シングルトンなので、グローバル状態に依存
    const result = isFirestoreInitialized();
    expect(typeof result).toBe('boolean');
  });
});
