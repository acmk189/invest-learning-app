/**
 * Terms ViewModel テスト
 * Task 22.1, 22.2, 22.3: 状態管理基盤、ローディング・エラー状態、リトライ機能
 *
 * TDD: RED - まずテストを書く
 *
 * Requirements:
 * - 5.1: 用語タブで3つ表示
 * - 5.3: 1日中同じ3用語表示
 * - 7.5: エラー時リトライオプション提供
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTermsViewModel, TermsState } from '../terms-viewmodel';
import { TermsRepository, TermsResult, TermsError } from '../terms-repository';
import { TermsData, TermItem } from '../../firestore/types';

// モック用語データ
const mockTermItems: TermItem[] = [
  {
    name: 'PER(株価収益率)',
    description:
      '株価を1株当たり純利益で割った指標。企業の株価が利益に対して何倍の価値で取引されているかを示します...',
    difficulty: 'beginner',
  },
  {
    name: 'ボラティリティ',
    description:
      '価格変動の激しさを示す指標。ボラティリティが高いほど、価格変動リスクが大きいことを意味します...',
    difficulty: 'intermediate',
  },
  {
    name: 'デリバティブ',
    description:
      '株式、債券、為替などの原資産から派生した金融商品の総称。先物取引やオプション取引などが含まれます...',
    difficulty: 'advanced',
  },
];

const mockTermsData: TermsData = {
  date: '2026-01-10',
  terms: mockTermItems,
  createdAt: '2026-01-10T08:00:00.000Z',
  updatedAt: '2026-01-10T08:00:00.000Z',
};

// モックエラー(FirestoreErrorCodeの型に準拠)
const mockError: TermsError = {
  code: 'CONNECTION_FAILED',
  message: 'サーバーに接続できませんでした。インターネット接続を確認してください。',
  retryable: true,
};

// TermsRepositoryモック作成ヘルパー
function createMockRepository(
  options: {
    success?: boolean;
    data?: TermsData | null;
    error?: TermsError;
  } = {}
): TermsRepository {
  const { success = true, data = mockTermsData, error } = options;

  return {
    getTodayTerms: jest.fn().mockResolvedValue({
      success,
      data,
      source: 'firestore',
      error,
    } as TermsResult),
  } as unknown as TermsRepository;
}

describe('useTermsViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 22.1: Terms状態管理基盤', () => {
    it('初期状態はloading: true, terms: null', () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

      expect(result.current.loading).toBe(true);
      expect(result.current.terms).toBeNull();
    });

    it('Repositoryから用語を取得し、3つの用語を配列として保持する', async () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Requirement 5.1: 3つの用語を配列として保持
      expect(result.current.terms).toHaveLength(3);
      expect(result.current.terms).toEqual(mockTermItems);
    });

    it('Repositoryのメソッドが呼ばれることを確認', async () => {
      const mockRepo = createMockRepository();

      renderHook(() => useTermsViewModel(mockRepo));

      await waitFor(() => {
        expect(mockRepo.getTodayTerms).toHaveBeenCalledTimes(1);
      });
    });

    it('用語データがnullの場合、termsもnull', async () => {
      const mockRepo = createMockRepository({ success: true, data: null });

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.terms).toBeNull();
    });

    it('用語が0件の場合、空配列を保持', async () => {
      const emptyTermsData: TermsData = {
        ...mockTermsData,
        terms: [],
      };
      const mockRepo = createMockRepository({ success: true, data: emptyTermsData });

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.terms).toEqual([]);
    });
  });

  describe('Task 22.2: Termsローディング・エラー状態管理', () => {
    it('データ取得中はloading: true', () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

      expect(result.current.loading).toBe(true);
      expect(result.current.state).toBe('loading');
    });

    it('データ取得成功時はstate: "success"', async () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

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

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });

    it('データがnullでもsuccessの場合はstate: "success"', async () => {
      const mockRepo = createMockRepository({ success: true, data: null });

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Task 22.3: Termsリトライ機能', () => {
    it('retry関数を提供する', async () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

      expect(typeof result.current.retry).toBe('function');
    });

    it('retry呼び出しで用語を再取得する', async () => {
      const mockRepo = createMockRepository();

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockRepo.getTodayTerms).toHaveBeenCalledTimes(1);

      // リトライ実行
      await act(async () => {
        await result.current.retry();
      });

      expect(mockRepo.getTodayTerms).toHaveBeenCalledTimes(2);
    });

    it('リトライ中はloading: true', async () => {
      // 遅延するモックを作成
      const mockRepo = {
        getTodayTerms: jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(
                  () =>
                    resolve({
                      success: true,
                      data: mockTermsData,
                      source: 'firestore',
                    }),
                  100
                )
              )
          ),
      } as unknown as TermsRepository;

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

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
        getTodayTerms: jest
          .fn()
          .mockResolvedValueOnce({
            success: false,
            data: null,
            source: 'firestore',
            error: mockError,
          } as TermsResult)
          .mockResolvedValueOnce({
            success: true,
            data: mockTermsData,
            source: 'firestore',
          } as TermsResult),
      } as unknown as TermsRepository;

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

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
      expect(result.current.terms).toEqual(mockTermItems);
    });
  });

  describe('統合テスト', () => {
    it('全状態遷移: loading -> success', async () => {
      const mockRepo = createMockRepository();
      const states: TermsState[] = [];

      const { result } = renderHook(() => {
        const viewModel = useTermsViewModel(mockRepo);
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
        getTodayTerms: jest
          .fn()
          .mockResolvedValueOnce({
            success: false,
            data: null,
            source: 'firestore',
            error: mockError,
          } as TermsResult)
          .mockResolvedValueOnce({
            success: true,
            data: mockTermsData,
            source: 'firestore',
          } as TermsResult),
      } as unknown as TermsRepository;

      const { result } = renderHook(() => useTermsViewModel(mockRepo));

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
      expect(result.current.terms).not.toBeNull();
      expect(result.current.terms).toHaveLength(3);
    });
  });
});
