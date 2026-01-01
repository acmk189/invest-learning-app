/**
 * リトライハンドラーのテスト
 * Task 2.2: エラーハンドリング共通機能実装
 */

import { RetryHandler, RetryConfig } from '../retry-handler';
import { NetworkError, ApiError } from '../types';

describe('RetryHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const handler = new RetryHandler();

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry up to maxRetries times on failure', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('失敗1'))
        .mockRejectedValueOnce(new NetworkError('失敗2'))
        .mockResolvedValue('success');

      const handler = new RetryHandler({ maxRetries: 3 });

      const promise = handler.executeWithRetry(mockFn);

      // 最初の失敗後、1秒待機
      await jest.advanceTimersByTimeAsync(1000);

      // 2回目の失敗後、2秒待機
      await jest.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after maxRetries exceeded', async () => {
      const error = new NetworkError('ネットワークエラー');
      const mockFn = jest.fn().mockRejectedValue(error);

      const handler = new RetryHandler({ maxRetries: 3 });

      // expectを先に設定してからタイマーを進める
      const expectation = expect(handler.executeWithRetry(mockFn)).rejects.toThrow(
        NetworkError
      );

      // 全てのタイマーを実行
      await jest.runAllTimersAsync();

      await expectation;
      expect(mockFn).toHaveBeenCalledTimes(4); // 初回 + 3回のリトライ
    });

    it('should use exponential backoff for retry delays', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('失敗1'))
        .mockRejectedValueOnce(new NetworkError('失敗2'))
        .mockRejectedValueOnce(new NetworkError('失敗3'))
        .mockResolvedValue('success');

      const handler = new RetryHandler({ maxRetries: 3, baseDelay: 1000 });

      const promise = handler.executeWithRetry(mockFn);

      // 1回目のリトライ: baseDelay * 2^0 = 1000ms
      await jest.advanceTimersByTimeAsync(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // 2回目のリトライ: baseDelay * 2^1 = 2000ms
      await jest.advanceTimersByTimeAsync(2000);
      expect(mockFn).toHaveBeenCalledTimes(3);

      // 3回目のリトライ: baseDelay * 2^2 = 4000ms
      await jest.advanceTimersByTimeAsync(4000);
      expect(mockFn).toHaveBeenCalledTimes(4);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should not retry non-retryable errors', async () => {
      const error = new ApiError('無効なAPIキー', 'ClaudeAPI', undefined, 401);
      error.retryable = false;

      const mockFn = jest.fn().mockRejectedValue(error);

      const handler = new RetryHandler({ maxRetries: 3 });

      await expect(handler.executeWithRetry(mockFn)).rejects.toThrow('無効なAPIキー');
      expect(mockFn).toHaveBeenCalledTimes(1); // リトライされない
    });

    it('should respect maxDelay configuration', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('失敗1'))
        .mockRejectedValueOnce(new NetworkError('失敗2'))
        .mockResolvedValue('success');

      const handler = new RetryHandler({
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 1500,
      });

      const promise = handler.executeWithRetry(mockFn);

      // 1回目のリトライ: min(1000 * 2^0, 1500) = 1000ms
      await jest.advanceTimersByTimeAsync(1000);

      // 2回目のリトライ: min(1000 * 2^1, 1500) = 1500ms (maxDelayでキャップ)
      await jest.advanceTimersByTimeAsync(1500);

      const result = await promise;
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback if provided', async () => {
      const onRetry = jest.fn();
      const error = new NetworkError('ネットワークエラー');
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const handler = new RetryHandler({ maxRetries: 1, onRetry });

      const promise = handler.executeWithRetry(mockFn);
      await jest.advanceTimersByTimeAsync(1000);
      await promise;

      expect(onRetry).toHaveBeenCalledWith(error, 1, 1000);
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retryable errors', () => {
      const handler = new RetryHandler();
      const error = new NetworkError('ネットワークエラー');

      expect(handler.shouldRetry(error, 1)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const handler = new RetryHandler();
      const error = new ApiError('認証エラー', 'ClaudeAPI');
      error.retryable = false;

      expect(handler.shouldRetry(error, 1)).toBe(false);
    });

    it('should return false when maxRetries exceeded', () => {
      const handler = new RetryHandler({ maxRetries: 2 });
      const error = new NetworkError('ネットワークエラー');

      expect(handler.shouldRetry(error, 3)).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const handler = new RetryHandler({ baseDelay: 1000 });

      expect(handler.calculateDelay(1)).toBe(1000); // 1000 * 2^0
      expect(handler.calculateDelay(2)).toBe(2000); // 1000 * 2^1
      expect(handler.calculateDelay(3)).toBe(4000); // 1000 * 2^2
    });

    it('should cap delay at maxDelay', () => {
      const handler = new RetryHandler({ baseDelay: 1000, maxDelay: 2500 });

      expect(handler.calculateDelay(1)).toBe(1000);
      expect(handler.calculateDelay(2)).toBe(2000);
      expect(handler.calculateDelay(3)).toBe(2500); // capped at maxDelay
      expect(handler.calculateDelay(4)).toBe(2500); // capped at maxDelay
    });
  });
});
