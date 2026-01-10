/**
 * 用語バッチリトライハンドラーテスト
 *
 * Task 12.1: 用語バッチリトライロジック
 *
 * バッチ処理失敗時に最大3回リトライする機能をテスト
 *
 * Requirements:
 * - 8.3 (失敗時3回リトライ)
 */

import { TermsBatchRetryHandler, TermsBatchRetryConfig } from '../termsBatchRetryHandler';
import { TermsBatchResult } from '../termsBatchService';

describe('TermsBatchRetryHandler', () => {
  // テスト用のモック結果を作成するヘルパー関数
  const createMockResult = (overrides: Partial<TermsBatchResult> = {}): TermsBatchResult => ({
    success: false,
    partialSuccess: false,
    databaseSaved: false,
    historyUpdated: false,
    metadataUpdated: false,
    processingTimeMs: 100,
    date: '2026-01-03',
    errors: [],
    ...overrides,
  });

  describe('constructor', () => {
    it('デフォルト設定で初期化できる', () => {
      const handler = new TermsBatchRetryHandler();
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.baseDelayMs).toBe(1000);
      expect(config.maxDelayMs).toBe(30000);
    });

    it('カスタム設定で初期化できる', () => {
      const customConfig: TermsBatchRetryConfig = {
        maxRetries: 5,
        baseDelayMs: 500,
        maxDelayMs: 10000,
      };

      const handler = new TermsBatchRetryHandler(customConfig);
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.baseDelayMs).toBe(500);
      expect(config.maxDelayMs).toBe(10000);
    });
  });

  describe('executeWithRetry', () => {
    it('最初の実行で成功した場合リトライしない', async () => {
      const handler = new TermsBatchRetryHandler();

      const executeFn = jest.fn().mockImplementation(async () => {
        return createMockResult({ success: true });
      });

      const result = await handler.executeWithRetry(executeFn);

      expect(result.success).toBe(true);
      expect(result.attemptCount).toBe(1);
      expect(result.totalRetries).toBe(0);
      expect(executeFn).toHaveBeenCalledTimes(1);
    });

    it('部分成功の場合リトライしない', async () => {
      const handler = new TermsBatchRetryHandler();

      const executeFn = jest.fn().mockImplementation(async () => {
        return createMockResult({ partialSuccess: true });
      });

      const result = await handler.executeWithRetry(executeFn);

      expect(result.partialSuccess).toBe(true);
      expect(result.attemptCount).toBe(1);
      expect(result.totalRetries).toBe(0);
      expect(executeFn).toHaveBeenCalledTimes(1);
    });

    it('失敗時に最大3回リトライする', async () => {
      const handler = new TermsBatchRetryHandler({
        maxRetries: 3,
        baseDelayMs: 10, // テスト高速化のため短い遅延
      });

      const executeFn = jest.fn().mockImplementation(async () => {
        return createMockResult({ success: false });
      });

      const result = await handler.executeWithRetry(executeFn);

      expect(result.success).toBe(false);
      expect(result.attemptCount).toBe(4); // 初回 + 3回リトライ
      expect(result.totalRetries).toBe(3);
      expect(executeFn).toHaveBeenCalledTimes(4);
    });

    it('リトライ中に成功した場合はそこで停止する', async () => {
      const handler = new TermsBatchRetryHandler({
        maxRetries: 3,
        baseDelayMs: 10,
      });

      let attempt = 0;
      const executeFn = jest.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 2) {
          return createMockResult({ success: true });
        }
        return createMockResult({ success: false });
      });

      const result = await handler.executeWithRetry(executeFn);

      expect(result.success).toBe(true);
      expect(result.attemptCount).toBe(2);
      expect(result.totalRetries).toBe(1);
      expect(executeFn).toHaveBeenCalledTimes(2);
    });

    it('例外発生時もリトライする', async () => {
      const handler = new TermsBatchRetryHandler({
        maxRetries: 2,
        baseDelayMs: 10,
      });

      let attempt = 0;
      const executeFn = jest.fn().mockImplementation(async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error('Test error');
        }
        return createMockResult({ success: true });
      });

      const result = await handler.executeWithRetry(executeFn);

      expect(result.success).toBe(true);
      expect(result.attemptCount).toBe(3);
      expect(result.exceptionOccurred).toBe(true);
    });

    it('onRetryコールバックが呼び出される', async () => {
      const onRetry = jest.fn();
      const handler = new TermsBatchRetryHandler({
        maxRetries: 2,
        baseDelayMs: 10,
        onRetry,
      });

      const executeFn = jest.fn().mockImplementation(async () => {
        return createMockResult({ success: false });
      });

      await handler.executeWithRetry(executeFn);

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ success: false })
      );
    });

    it('処理時間が正しく計測される', async () => {
      const handler = new TermsBatchRetryHandler({
        baseDelayMs: 50,
      });

      const executeFn = jest.fn().mockImplementation(async () => {
        return createMockResult({ success: true });
      });

      const result = await handler.executeWithRetry(executeFn);

      expect(result.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateDelay', () => {
    it('指数バックオフで遅延時間を計算する', () => {
      const handler = new TermsBatchRetryHandler({
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      });

      // 1回目: 1000 * 2^0 = 1000
      expect(handler.calculateDelay(1)).toBe(1000);
      // 2回目: 1000 * 2^1 = 2000
      expect(handler.calculateDelay(2)).toBe(2000);
      // 3回目: 1000 * 2^2 = 4000
      expect(handler.calculateDelay(3)).toBe(4000);
    });

    it('最大遅延時間を超えない', () => {
      const handler = new TermsBatchRetryHandler({
        baseDelayMs: 1000,
        maxDelayMs: 5000,
      });

      // 4回目: 1000 * 2^3 = 8000 -> 5000にクリップ
      expect(handler.calculateDelay(4)).toBe(5000);
      // 5回目: 1000 * 2^4 = 16000 -> 5000にクリップ
      expect(handler.calculateDelay(5)).toBe(5000);
    });
  });
});
