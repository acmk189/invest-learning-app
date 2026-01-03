/**
 * Firestore クエリ テスト
 * Task 14.2: 日付ベースクエリを実装する
 *
 * Requirements: 2.1, 5.1
 */

import {
  fetchTodayNews,
  fetchTodayTerms,
  fetchBatchMetadata,
  formatDateToJST,
} from '../queries';

// モック設定
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
}));

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = jest.fn(() => ({
    collection: mockCollection,
  }));

  return {
    __esModule: true,
    default: mockFirestore,
  };
});

describe('formatDateToJST', () => {
  it('日付をYYYY-MM-DD形式に変換すること', () => {
    // UTC 2024-01-15T00:00:00.000Z -> JST 2024-01-15 09:00:00
    const date = new Date('2024-01-15T00:00:00.000Z');
    const result = formatDateToJST(date);
    expect(result).toBe('2024-01-15');
  });

  it('日付変更線をまたぐ場合に正しい日付を返すこと', () => {
    // UTC 2024-01-14T23:00:00.000Z -> JST 2024-01-15 08:00:00
    const date = new Date('2024-01-14T23:00:00.000Z');
    const result = formatDateToJST(date);
    expect(result).toBe('2024-01-15');
  });
});

describe('fetchTodayNews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('今日のニュースを取得できること', async () => {
    const mockNewsData = {
      date: '2024-01-15',
      worldNews: {
        title: '世界のニュース',
        summary: 'サマリー'.repeat(400),
        updatedAt: { toDate: () => new Date('2024-01-15T08:00:00.000Z') },
      },
      japanNews: {
        title: '日本のニュース',
        summary: 'サマリー'.repeat(400),
        updatedAt: { toDate: () => new Date('2024-01-15T08:00:00.000Z') },
      },
      createdAt: { toDate: () => new Date('2024-01-15T08:00:00.000Z') },
      updatedAt: { toDate: () => new Date('2024-01-15T08:00:00.000Z') },
    };

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => mockNewsData,
    });

    const result = await fetchTodayNews();

    expect(result.exists).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.worldNews.title).toBe('世界のニュース');
    expect(result.data?.japanNews.title).toBe('日本のニュース');
  });

  it('データが存在しない場合にnullを返すこと', async () => {
    mockGet.mockResolvedValueOnce({
      exists: false,
      data: () => null,
    });

    const result = await fetchTodayNews();

    expect(result.exists).toBe(false);
    expect(result.data).toBeNull();
  });

  it('エラー発生時にFirestoreErrorをスローすること', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchTodayNews()).rejects.toThrow();
  });
});

describe('fetchTodayTerms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('今日の用語を取得できること', async () => {
    const mockTermsData = {
      date: '2024-01-15',
      terms: [
        { name: '用語1', description: '説明'.repeat(100), difficulty: 'beginner' },
        { name: '用語2', description: '説明'.repeat(100), difficulty: 'intermediate' },
        { name: '用語3', description: '説明'.repeat(100), difficulty: 'advanced' },
      ],
      createdAt: { toDate: () => new Date('2024-01-15T08:00:00.000Z') },
      updatedAt: { toDate: () => new Date('2024-01-15T08:00:00.000Z') },
    };

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => mockTermsData,
    });

    const result = await fetchTodayTerms();

    expect(result.exists).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.terms).toHaveLength(3);
    expect(result.data?.terms[0].name).toBe('用語1');
  });

  it('データが存在しない場合にnullを返すこと', async () => {
    mockGet.mockResolvedValueOnce({
      exists: false,
      data: () => null,
    });

    const result = await fetchTodayTerms();

    expect(result.exists).toBe(false);
    expect(result.data).toBeNull();
  });

  it('エラー発生時にFirestoreErrorをスローすること', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchTodayTerms()).rejects.toThrow();
  });
});

describe('fetchBatchMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('バッチメタデータを取得できること', async () => {
    const mockMetadata = {
      newsLastUpdated: { toMillis: () => 1705309200000 },
      termsLastUpdated: { toMillis: () => 1705309200000 },
    };

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => mockMetadata,
    });

    const result = await fetchBatchMetadata();

    expect(result).not.toBeNull();
    expect(result?.newsLastUpdated).toBe(1705309200000);
    expect(result?.termsLastUpdated).toBe(1705309200000);
  });

  it('メタデータが存在しない場合にnullを返すこと', async () => {
    mockGet.mockResolvedValueOnce({
      exists: false,
      data: () => null,
    });

    const result = await fetchBatchMetadata();

    expect(result).toBeNull();
  });

  it('エラー発生時にnullを返すこと（キャッシュフォールバック用）', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchBatchMetadata();

    expect(result).toBeNull();
  });
});
