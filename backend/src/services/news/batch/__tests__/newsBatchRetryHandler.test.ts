/**
 * ニュースバッチリトライハンドラーのテスト
 *
 * Task 9.1: ニュースバッチリトライロジック
 *
 * Requirements:
 * - 8.3 (失敗時3回リトライ)
 *
 * バッチ処理失敗時に最大3回リトライする機能をテストする
 */

import {
  NewsBatchRetryHandler,
  NewsBatchRetryConfig,
} from '../newsBatchRetryHandler';
import { NewsBatchResult } from '../newsBatchService';

describe('NewsBatchRetryHandler', () => {
  // モックのバッチ結果を作成するヘルパー関数
  const createSuccessResult = (): NewsBatchResult => ({
    success: true,
    partialSuccess: false,
    databaseSaved: true,
    metadataUpdated: true,
    processingTimeMs: 1000,
    date: '2026-01-02',
    worldNews: {
      title: '世界の投資・金融ニュース',
      summary: 'テスト要約',
      characterCount: 2000,
      updatedAt: new Date(),
    },
    japanNews: {
      title: '日本の投資・金融ニュース',
      summary: 'テスト要約',
      characterCount: 2000,
      updatedAt: new Date(),
    },
    errors: [],
  });

  const createFailureResult = (
    errorType: string = 'world-news-fetch'
  ): NewsBatchResult => ({
    success: false,
    partialSuccess: false,
    databaseSaved: false,
    metadataUpdated: false,
    processingTimeMs: 500,
    date: '2026-01-02',
    errors: [
      {
        type: errorType,
        message: 'テストエラー',
        timestamp: new Date(),
      },
    ],
  });

  const createPartialSuccessResult = (): NewsBatchResult => ({
    success: false,
    partialSuccess: true,
    databaseSaved: true,
    metadataUpdated: true,
    processingTimeMs: 800,
    date: '2026-01-02',
    worldNews: {
      title: '世界の投資・金融ニュース',
      summary: 'テスト要約',
      characterCount: 2000,
      updatedAt: new Date(),
    },
    errors: [
      {
        type: 'japan-news-fetch',
        message: '日本ニュース取得エラー',
        timestamp: new Date(),
      },
    ],
  });

  describe('デフォルト設定', () => {
    it('デフォルト設定でハンドラーを初期化できる', () => {
      const handler = new NewsBatchRetryHandler();
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.baseDelayMs).toBe(1000);
      expect(config.maxDelayMs).toBe(30000);
    });
  });

  describe('カスタム設定', () => {
    it('カスタム設定でハンドラーを初期化できる', () => {
      const customConfig: NewsBatchRetryConfig = {
        maxRetries: 5,
        baseDelayMs: 2000,
        maxDelayMs: 60000,
      };
      const handler = new NewsBatchRetryHandler(customConfig);
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.baseDelayMs).toBe(2000);
      expect(config.maxDelayMs).toBe(60000);
    });
  });

  describe('リトライロジック', () => {
    it('最初の実行で成功した場合、リトライしない', async () => {
      const handler = new NewsBatchRetryHandler();
      const mockExecute = jest.fn().mockResolvedValue(createSuccessResult());

      const result = await handler.executeWithRetry(mockExecute);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.attemptCount).toBe(1);
      expect(result.totalRetries).toBe(0);
    });

    it('失敗時に最大3回までリトライする', async () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1, // テスト用に遅延を最小化
        maxDelayMs: 1,
      });
      const mockExecute = jest.fn().mockResolvedValue(createFailureResult());

      const result = await handler.executeWithRetry(mockExecute);

      // 初回 + リトライ3回 = 4回
      expect(mockExecute).toHaveBeenCalledTimes(4);
      expect(result.success).toBe(false);
      expect(result.attemptCount).toBe(4);
      expect(result.totalRetries).toBe(3);
    });

    it('2回目で成功した場合、リトライは1回で止まる', async () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
      });
      const mockExecute = jest
        .fn()
        .mockResolvedValueOnce(createFailureResult())
        .mockResolvedValueOnce(createSuccessResult());

      const result = await handler.executeWithRetry(mockExecute);

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.attemptCount).toBe(2);
      expect(result.totalRetries).toBe(1);
    });

    it('部分成功の場合はリトライしない', async () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
      });
      const mockExecute = jest
        .fn()
        .mockResolvedValue(createPartialSuccessResult());

      const result = await handler.executeWithRetry(mockExecute);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.partialSuccess).toBe(true);
      expect(result.totalRetries).toBe(0);
    });
  });

  describe('指数バックオフ', () => {
    it('指数バックオフで遅延時間を計算する', () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      });

      // リトライ1回目: 1000ms
      expect(handler.calculateDelay(1)).toBe(1000);
      // リトライ2回目: 2000ms
      expect(handler.calculateDelay(2)).toBe(2000);
      // リトライ3回目: 4000ms
      expect(handler.calculateDelay(3)).toBe(4000);
    });

    it('最大遅延時間を超えない', () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 10000,
        maxDelayMs: 15000,
      });

      // リトライ3回目: 40000ms → 15000msに制限
      expect(handler.calculateDelay(3)).toBe(15000);
    });
  });

  describe('リトライコールバック', () => {
    it('リトライ時にコールバックが呼び出される', async () => {
      const onRetry = jest.fn();
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
        onRetry,
      });
      const mockExecute = jest.fn().mockResolvedValue(createFailureResult());

      await handler.executeWithRetry(mockExecute);

      // 3回リトライするので、コールバックも3回呼ばれる
      expect(onRetry).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Number), // attempt
        expect.any(Number), // delay
        expect.any(Object) // result
      );
    });

    it('コールバックに正しいリトライ回数が渡される', async () => {
      const onRetry = jest.fn();
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
        onRetry,
      });
      const mockExecute = jest.fn().mockResolvedValue(createFailureResult());

      await handler.executeWithRetry(mockExecute);

      // リトライ回数の確認
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Number), expect.any(Object));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Number), expect.any(Object));
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, expect.any(Number), expect.any(Object));
    });
  });

  describe('リトライ結果の構造', () => {
    it('結果に全試行回数が含まれる', async () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
      });
      const mockExecute = jest.fn().mockResolvedValue(createFailureResult());

      const result = await handler.executeWithRetry(mockExecute);

      expect(result.attemptCount).toBe(4);
    });

    it('結果にリトライ回数が含まれる', async () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
      });
      const mockExecute = jest.fn().mockResolvedValue(createFailureResult());

      const result = await handler.executeWithRetry(mockExecute);

      expect(result.totalRetries).toBe(3);
    });

    it('結果に最終処理時間が含まれる', async () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
      });
      const mockExecute = jest.fn().mockResolvedValue(createSuccessResult());

      const result = await handler.executeWithRetry(mockExecute);

      // 処理時間は0以上（非常に高速な処理の場合は0になることもある）
      expect(result.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('成功時にfinalResultが元の結果を含む', async () => {
      const handler = new NewsBatchRetryHandler();
      const successResult = createSuccessResult();
      const mockExecute = jest.fn().mockResolvedValue(successResult);

      const result = await handler.executeWithRetry(mockExecute);

      expect(result.finalResult.success).toBe(true);
      expect(result.finalResult.worldNews).toBeDefined();
      expect(result.finalResult.japanNews).toBeDefined();
    });
  });

  describe('例外処理', () => {
    it('例外がスローされた場合もリトライする', async () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
      });
      const mockExecute = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(createSuccessResult());

      const result = await handler.executeWithRetry(mockExecute);

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('全リトライで例外が発生した場合、失敗結果を返す', async () => {
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
      });
      const mockExecute = jest.fn().mockRejectedValue(new Error('Critical Error'));

      const result = await handler.executeWithRetry(mockExecute);

      expect(mockExecute).toHaveBeenCalledTimes(4);
      expect(result.success).toBe(false);
      expect(result.exceptionOccurred).toBe(true);
    });
  });

  describe('ログ記録', () => {
    it('リトライ開始時にログを出力する', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const handler = new NewsBatchRetryHandler({
        baseDelayMs: 1,
        maxDelayMs: 1,
      });
      const mockExecute = jest.fn().mockResolvedValue(createFailureResult());

      await handler.executeWithRetry(mockExecute);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NewsBatchRetryHandler]')
      );
      consoleSpy.mockRestore();
    });
  });
});
