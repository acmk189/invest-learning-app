/**
 * 用語バッチエラーロガーテスト
 *
 * Task 12.4: 用語最終失敗時詳細ログ保存
 *
 * 最終的な失敗時にFirestore error_logsコレクションに詳細ログを保存する機能をテスト
 *
 * Requirements:
 * - 8.5 (外部API障害時エラーハンドリング+ログ)
 */

import { TermsBatchErrorLogger, TermsBatchErrorLogEntry } from '../termsBatchErrorLogger';
import { TermsBatchRetryResult } from '../termsBatchRetryHandler';
import { TermsBatchResult } from '../termsBatchService';
import { getFirestore } from '../../../../config/firebase';

// Firestoreモック
jest.mock('../../../../config/firebase', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      add: jest.fn().mockResolvedValue({ id: 'test-doc-id' }),
    })),
  })),
}));

const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;

describe('TermsBatchErrorLogger', () => {
  let logger: TermsBatchErrorLogger;

  // テスト用のモック結果を作成するヘルパー関数
  const createMockBatchResult = (
    overrides: Partial<TermsBatchResult> = {}
  ): TermsBatchResult => ({
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

  const createMockRetryResult = (
    overrides: Partial<TermsBatchRetryResult> = {}
  ): TermsBatchRetryResult => ({
    success: false,
    partialSuccess: false,
    finalResult: createMockBatchResult(),
    attemptCount: 4,
    totalRetries: 3,
    totalProcessingTimeMs: 5000,
    exceptionOccurred: false,
    ...overrides,
  });

  beforeEach(() => {
    logger = new TermsBatchErrorLogger();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('デフォルト設定で初期化できる', () => {
      const defaultLogger = new TermsBatchErrorLogger();
      expect(defaultLogger).toBeDefined();
    });

    it('カスタムコレクション名で初期化できる', () => {
      const customLogger = new TermsBatchErrorLogger({
        collectionName: 'custom_error_logs',
      });
      expect(customLogger).toBeDefined();
    });
  });

  describe('logFinalFailure', () => {
    it('最終失敗時にログをFirestoreに保存する', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'test-doc-id' });
      mockGetFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          add: mockAdd,
        })),
      } as any);

      const retryResult = createMockRetryResult({
        finalResult: createMockBatchResult({
          errors: [
            {
              type: 'term-generation-beginner',
              message: '初級用語生成失敗',
              timestamp: new Date('2026-01-03T00:00:00Z'),
            },
          ],
        }),
      });

      await logger.logFinalFailure(retryResult);

      expect(mockAdd).toHaveBeenCalledTimes(1);
      const savedLog = mockAdd.mock.calls[0][0] as TermsBatchErrorLogEntry;
      expect(savedLog.batchType).toBe('terms');
      expect(savedLog.date).toBe('2026-01-03');
      expect(savedLog.attemptCount).toBe(4);
      expect(savedLog.totalRetries).toBe(3);
      expect(savedLog.errors).toHaveLength(1);
    });

    it('コンテキスト情報を含めて保存できる', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'test-doc-id' });
      mockGetFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          add: mockAdd,
        })),
      } as any);

      const retryResult = createMockRetryResult();
      const context = { environment: 'production', triggeredBy: 'cron' };

      await logger.logFinalFailure(retryResult, context);

      const savedLog = mockAdd.mock.calls[0][0] as TermsBatchErrorLogEntry;
      expect(savedLog.context).toEqual(context);
    });

    it('Firestore保存失敗時はコンソールにエラーを出力する', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          add: jest.fn().mockRejectedValue(new Error('Firestore error')),
        })),
      } as any);

      const retryResult = createMockRetryResult();

      // エラーをスローしないことを確認
      await expect(logger.logFinalFailure(retryResult)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logSummaryToConsole', () => {
    it('サマリーをコンソールに出力する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const retryResult = createMockRetryResult({
        finalResult: createMockBatchResult({
          errors: [
            {
              type: 'term-generation-beginner',
              message: '初級用語生成失敗',
              timestamp: new Date(),
            },
          ],
        }),
      });

      logger.logSummaryToConsole(retryResult);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('エラー詳細を出力する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const retryResult = createMockRetryResult({
        finalResult: createMockBatchResult({
          errors: [
            {
              type: 'term-generation-beginner',
              message: '初級用語生成失敗',
              timestamp: new Date(),
            },
            {
              type: 'term-generation-intermediate',
              message: '中級用語生成失敗',
              timestamp: new Date(),
            },
          ],
        }),
      });

      logger.logSummaryToConsole(retryResult);

      // 複数回呼び出されることを確認(ヘッダー、詳細、フッターなど)
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(1);
      consoleSpy.mockRestore();
    });
  });
});
