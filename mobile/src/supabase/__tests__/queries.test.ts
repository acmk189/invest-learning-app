/**
 * Supabase クエリ テスト
 * Task 9: フロントエンドクエリ実装
 *
 * TDDアプローチで実装されたクエリ関数のテスト
 *
 * Requirements:
 * - 8: フロントエンドクエリ実装
 * - 8.1: 今日のニュース取得クエリ
 * - 8.2: 今日の用語取得クエリ
 * - 8.3: バッチメタデータ取得クエリ
 * - 8.5: エラーハンドリング
 */

import {
  getTodayNews,
  getTodayTerms,
  getBatchMetadata,
  SupabaseQueryError,
} from '../queries';
import { getSupabaseInstance, resetSupabaseClient, initializeSupabaseClient } from '../client';
import { NewsRow, TermRow, BatchMetadataRow, TABLES } from '../types';

// Supabase SDKのモック
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
  })),
}));

describe('Supabase Queries', () => {
  // モック用のSupabaseクエリビルダー
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockLimit: jest.Mock;
  let mockSingle: jest.Mock;
  let mockOrder: jest.Mock;

  beforeEach(async () => {
    // シングルトンをリセット
    resetSupabaseClient();

    // クエリビルダーのモックを設定
    // Supabaseのクエリはチェーンで呼び出されるため、各メソッドがthisを返す
    mockSingle = jest.fn();
    mockLimit = jest.fn(() => ({ single: mockSingle, data: null, error: null }));
    mockOrder = jest.fn(() => ({ limit: mockLimit, data: null, error: null }));
    mockEq = jest.fn(() => ({ order: mockOrder, limit: mockLimit, single: mockSingle, data: null, error: null }));
    mockSelect = jest.fn(() => ({ eq: mockEq, limit: mockLimit, single: mockSingle, data: null, error: null }));
    mockFrom = jest.fn(() => ({ select: mockSelect }));

    // Supabaseクライアントを初期化(モック)
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue({ from: mockFrom });

    await initializeSupabaseClient({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodayNews', () => {
    const TEST_DATE = '2026-01-11';
    const MOCK_NEWS_ROW: NewsRow = {
      date: TEST_DATE,
      world_news_title: '世界ニュースタイトル',
      world_news_summary: '世界ニュース要約',
      japan_news_title: '日本ニュースタイトル',
      japan_news_summary: '日本ニュース要約',
      created_at: '2026-01-11T00:00:00Z',
      updated_at: '2026-01-11T08:00:00Z',
    };

    it('指定日のニュースを取得できる', async () => {
      // モックの設定: 成功レスポンス
      mockSingle.mockResolvedValue({ data: MOCK_NEWS_ROW, error: null });

      const result = await getTodayNews(TEST_DATE);

      // fromが正しいテーブルで呼ばれたか
      expect(mockFrom).toHaveBeenCalledWith(TABLES.NEWS);
      // selectが呼ばれたか
      expect(mockSelect).toHaveBeenCalledWith('*');
      // eqが日付で呼ばれたか
      expect(mockEq).toHaveBeenCalledWith('date', TEST_DATE);
      // singleが呼ばれたか
      expect(mockSingle).toHaveBeenCalled();

      // 結果の検証
      expect(result).not.toBeNull();
      expect(result?.date).toBe(TEST_DATE);
      expect(result?.world_news_title).toBe('世界ニュースタイトル');
      expect(result?.japan_news_title).toBe('日本ニュースタイトル');
    });

    it('ニュースが見つからない場合はnullを返す', async () => {
      // モックの設定: データなし
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await getTodayNews(TEST_DATE);

      expect(result).toBeNull();
    });

    it('Supabaseエラー時はSupabaseQueryErrorをスローする', async () => {
      // モックの設定: エラーレスポンス
      const supabaseError = {
        code: 'PGRST116',
        message: 'No rows found',
        details: null,
        hint: null,
      };
      mockSingle.mockResolvedValue({ data: null, error: supabaseError });

      await expect(getTodayNews(TEST_DATE)).rejects.toThrow(SupabaseQueryError);
      await expect(getTodayNews(TEST_DATE)).rejects.toMatchObject({
        code: 'PGRST116',
        message: 'No rows found',
      });
    });

    it('無効な日付形式でエラーをスローする', async () => {
      await expect(getTodayNews('invalid-date')).rejects.toThrow();
      await expect(getTodayNews('')).rejects.toThrow();
    });
  });

  describe('getTodayTerms', () => {
    const TEST_DATE = '2026-01-11';
    const MOCK_TERM_ROWS: TermRow[] = [
      {
        id: 1,
        date: TEST_DATE,
        name: '用語1',
        description: '用語1の説明',
        difficulty: 'beginner',
        created_at: '2026-01-11T00:00:00Z',
      },
      {
        id: 2,
        date: TEST_DATE,
        name: '用語2',
        description: '用語2の説明',
        difficulty: 'intermediate',
        created_at: '2026-01-11T00:00:00Z',
      },
      {
        id: 3,
        date: TEST_DATE,
        name: '用語3',
        description: '用語3の説明',
        difficulty: 'advanced',
        created_at: '2026-01-11T00:00:00Z',
      },
    ];

    it('指定日の用語を3件取得できる', async () => {
      // モックの設定: 成功レスポンス
      mockOrder.mockReturnValue({ data: MOCK_TERM_ROWS, error: null });

      const result = await getTodayTerms(TEST_DATE);

      // fromが正しいテーブルで呼ばれたか
      expect(mockFrom).toHaveBeenCalledWith(TABLES.TERMS);
      // selectが呼ばれたか
      expect(mockSelect).toHaveBeenCalledWith('*');
      // eqが日付で呼ばれたか
      expect(mockEq).toHaveBeenCalledWith('date', TEST_DATE);
      // orderがcreated_at ascで呼ばれたか
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });

      // 結果の検証
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('用語1');
      expect(result[1].name).toBe('用語2');
      expect(result[2].name).toBe('用語3');
    });

    it('用語が見つからない場合は空配列を返す', async () => {
      // モックの設定: データなし
      mockOrder.mockReturnValue({ data: [], error: null });

      const result = await getTodayTerms(TEST_DATE);

      expect(result).toEqual([]);
    });

    it('dataがnullの場合も空配列を返す', async () => {
      // モックの設定: null
      mockOrder.mockReturnValue({ data: null, error: null });

      const result = await getTodayTerms(TEST_DATE);

      expect(result).toEqual([]);
    });

    it('Supabaseエラー時はSupabaseQueryErrorをスローする', async () => {
      // モックの設定: エラーレスポンス
      const supabaseError = {
        code: '42P01',
        message: 'relation "terms" does not exist',
        details: null,
        hint: null,
      };
      mockOrder.mockReturnValue({ data: null, error: supabaseError });

      await expect(getTodayTerms(TEST_DATE)).rejects.toThrow(SupabaseQueryError);
    });

    it('無効な日付形式でエラーをスローする', async () => {
      await expect(getTodayTerms('2026/01/11')).rejects.toThrow();
    });
  });

  describe('getBatchMetadata', () => {
    const MOCK_METADATA_ROW: BatchMetadataRow = {
      id: 1,
      news_last_updated: '2026-01-11T08:00:00Z',
      terms_last_updated: '2026-01-11T08:00:00Z',
    };

    it('バッチメタデータを取得できる', async () => {
      // モックの設定: 成功レスポンス
      mockSingle.mockResolvedValue({ data: MOCK_METADATA_ROW, error: null });

      const result = await getBatchMetadata();

      // fromが正しいテーブルで呼ばれたか
      expect(mockFrom).toHaveBeenCalledWith(TABLES.BATCH_METADATA);
      // selectが呼ばれたか
      expect(mockSelect).toHaveBeenCalledWith('*');
      // eqがid=1で呼ばれたか
      expect(mockEq).toHaveBeenCalledWith('id', 1);
      // singleが呼ばれたか
      expect(mockSingle).toHaveBeenCalled();

      // 結果の検証
      expect(result).not.toBeNull();
      expect(result?.news_last_updated).toBe('2026-01-11T08:00:00Z');
      expect(result?.terms_last_updated).toBe('2026-01-11T08:00:00Z');
    });

    it('メタデータが見つからない場合はnullを返す', async () => {
      // モックの設定: データなし
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await getBatchMetadata();

      expect(result).toBeNull();
    });

    it('Supabaseエラー時はSupabaseQueryErrorをスローする', async () => {
      // モックの設定: エラーレスポンス
      const supabaseError = {
        code: '28000',
        message: 'Invalid authentication',
        details: null,
        hint: null,
      };
      mockSingle.mockResolvedValue({ data: null, error: supabaseError });

      await expect(getBatchMetadata()).rejects.toThrow(SupabaseQueryError);
    });
  });

  describe('SupabaseQueryError', () => {
    it('エラー情報を正しく保持する', () => {
      const error = new SupabaseQueryError(
        'PGRST116',
        'No rows found',
        'Query returned no results',
        null
      );

      expect(error.code).toBe('PGRST116');
      expect(error.message).toBe('No rows found');
      expect(error.details).toBe('Query returned no results');
      expect(error.hint).toBeNull();
      expect(error.name).toBe('SupabaseQueryError');
    });

    it('Errorを継承している', () => {
      const error = new SupabaseQueryError('TEST', 'test message', null, null);
      expect(error).toBeInstanceOf(Error);
    });
  });
});
