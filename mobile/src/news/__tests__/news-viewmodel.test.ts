/**
 * News ViewModel テスト
 * Task 18.1, 18.2, 18.3: 状態管理基盤、ローディング・エラー状態、リトライ機能
 *
 * TDD: RED - まずテストを書く
 *
 * Requirements:
 * - 2.1: アプリ起動時当日ニュース表示
 * - 2.2: 世界・日本2カテゴリ表示
 * - 7.5: エラー時リトライオプション提供
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNewsViewModel, NewsState } from '../news-viewmodel';
import { NewsRepository, NewsResult, NewsError } from '../news-repository';
import { NewsData } from '../../supabase/types';

// モックデータ
const mockNewsData: NewsData = {
  date: '2026-01-07',
  worldNews: {
    title: '世界経済ニュース',
    summary: '世界経済に関する要約...',
    updatedAt: '2026-01-07T08:00:00.000Z',
  },
  japanNews: {
    title: '日本経済ニュース',
    summary: '日本経済に関する要約...',
    updatedAt: '2026-01-07T08:00:00.000Z',
  },
  createdAt: '2026-01-07T08:00:00.000Z',
  updatedAt: '2026-01-07T08:00:00.000Z',
};

// モックエラー(SupabaseErrorCodeの型に準拠)
const mockError: NewsError = {
  code: 'CONNECTION_FAILED',
  message: 'サーバーに接続できませんでした。インターネット接続を確認してください。',
  retryable: true,
};

// NewsRepositoryモック作成ヘルパー
function createMockRepository(
  options: {
    success?: boolean;
    data?: NewsData | null;
    error?: NewsError;
  } = {}
): NewsRepository {
  const { success = true, data = mockNewsData, error } = options;

  return {
    getTodayNews: jest.fn().mockResolvedValue({
      success,
      data,
      source: 'supabase',
      error,
    } as NewsResult),
  } as unknown as NewsRepository;
}

describe('useNewsViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 18.1: News状態管理基盤', () => {
    it('初期状態はloading: true, data: null', () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      expect(result.current.loading).toBe(true);
      expect(result.current.worldNews).toBeNull();
      expect(result.current.japanNews).toBeNull();
    });

    it('Repositoryからニュースを取得し、世界・日本ニュースを分離して保持する', async () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Requirement 2.2: 世界・日本を分離保持
      expect(result.current.worldNews).toEqual(mockNewsData.worldNews);
      expect(result.current.japanNews).toEqual(mockNewsData.japanNews);
    });

    it('Repositoryのメソッドが呼ばれることを確認', async () => {
      const mockRepo = createMockRepository();

      renderHook(() => useNewsViewModel(mockRepo));

      await waitFor(() => {
        expect(mockRepo.getTodayNews).toHaveBeenCalledTimes(1);
      });
    });

    it('ニュースデータがnullの場合、worldNewsとjapanNewsもnull', async () => {
      const mockRepo = createMockRepository({ success: true, data: null });

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.worldNews).toBeNull();
      expect(result.current.japanNews).toBeNull();
    });
  });

  describe('Task 18.2: Newsローディング・エラー状態管理', () => {
    it('データ取得中はloading: true', () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      expect(result.current.loading).toBe(true);
      expect(result.current.state).toBe('loading');
    });

    it('データ取得成功時はstate: "success"', async () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('データ取得失敗時はstate: "error"とエラー情報を保持', async () => {
      const mockRepo = createMockRepository({
        success: false,
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });

    it('データがnullでもsuccessの場合はstate: "success"', async () => {
      const mockRepo = createMockRepository({ success: true, data: null });

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Task 18.3: Newsリトライ機能', () => {
    it('retry関数を提供する', async () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      expect(typeof result.current.retry).toBe('function');
    });

    it('retry呼び出しでニュースを再取得する', async () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockRepo.getTodayNews).toHaveBeenCalledTimes(1);

      // リトライ実行
      await act(async () => {
        await result.current.retry();
      });

      expect(mockRepo.getTodayNews).toHaveBeenCalledTimes(2);
    });

    it('リトライ中はloading: true', async () => {
      // 遅延するモックを作成
      const mockRepo = {
        getTodayNews: jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(
                  () =>
                    resolve({
                      success: true,
                      data: mockNewsData,
                      source: 'supabase',
                    }),
                  100
                )
              )
          ),
      } as unknown as NewsRepository;

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      // 初回取得完了を待つ
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // リトライ開始
      act(() => {
        result.current.retry();
      });

      // リトライ中はloading: true
      expect(result.current.loading).toBe(true);
      expect(result.current.state).toBe('loading');

      // リトライ完了を待つ
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('エラー状態からリトライで成功に遷移できる', async () => {
      const mockRepo = {
        getTodayNews: jest
          .fn()
          .mockResolvedValueOnce({
            success: false,
            data: null,
            source: 'supabase',
            error: mockError,
          } as NewsResult)
          .mockResolvedValueOnce({
            success: true,
            data: mockNewsData,
            source: 'supabase',
          } as NewsResult),
      } as unknown as NewsRepository;

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      // 初回はエラー
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });

      expect(result.current.error).toEqual(mockError);

      // リトライ実行
      await act(async () => {
        await result.current.retry();
      });

      // リトライ後は成功
      expect(result.current.state).toBe('success');
      expect(result.current.error).toBeNull();
      expect(result.current.worldNews).toEqual(mockNewsData.worldNews);
      expect(result.current.japanNews).toEqual(mockNewsData.japanNews);
    });
  });

  describe('統合テスト', () => {
    it('全状態遷移: loading -> success', async () => {
      const mockRepo = createMockRepository();
      const states: NewsState[] = [];

      const { result } = renderHook(() => {
        const viewModel = useNewsViewModel(mockRepo);
        // 状態を記録
        if (!states.includes(viewModel.state)) {
          states.push(viewModel.state);
        }
        return viewModel;
      });

      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });

      // loading -> success の遷移を確認
      expect(states).toContain('loading');
      expect(states).toContain('success');
    });

    it('全状態遷移: loading -> error -> loading -> success', async () => {
      const mockRepo = {
        getTodayNews: jest
          .fn()
          .mockResolvedValueOnce({
            success: false,
            data: null,
            source: 'supabase',
            error: mockError,
          } as NewsResult)
          .mockResolvedValueOnce({
            success: true,
            data: mockNewsData,
            source: 'supabase',
          } as NewsResult),
      } as unknown as NewsRepository;

      const { result } = renderHook(() => useNewsViewModel(mockRepo));

      // エラー状態を待つ
      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });

      // リトライ
      await act(async () => {
        await result.current.retry();
      });

      // 成功状態を確認
      expect(result.current.state).toBe('success');
      expect(result.current.worldNews).not.toBeNull();
      expect(result.current.japanNews).not.toBeNull();
    });
  });
});
