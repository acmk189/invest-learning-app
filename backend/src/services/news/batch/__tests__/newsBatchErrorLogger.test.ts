/**
 * ニュース最終失敗時詳細ログ保存のテスト
 *
 * Task 9.4: ニュース最終失敗時詳細ログ保存
 *
 * Requirements:
 * - 8.5 (外部API障害時エラーハンドリング+ログ)
 *
 * 最終的な失敗時にFirestore error_logsに詳細ログを保存する機能をテストする
 */

import {
  NewsBatchErrorLogger,
  BatchErrorLogEntry,
  BatchErrorLogConfig,
} from '../newsBatchErrorLogger';
import { NewsBatchResult } from '../newsBatchService';
import { NewsBatchRetryResult } from '../newsBatchRetryHandler';

// Firebase Admin SDKのモック
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  add: jest.fn().mockResolvedValue({ id: 'test-doc-id' }),
};

jest.mock('../../../../config/firebase', () => ({
  getFirestore: () => mockFirestore,
}));

describe('NewsBatchErrorLogger', () => {
  let logger: NewsBatchErrorLogger;

  // サンプルデータ
  const createFailedBatchResult = (): NewsBatchResult => ({
    success: false,
    partialSuccess: false,
    databaseSaved: false,
    metadataUpdated: false,
    processingTimeMs: 500,
    date: '2026-01-02',
    errors: [
      {
        type: 'world-news-fetch',
        message: 'NewsAPI接続タイムアウト',
        timestamp: new Date('2026-01-02T08:00:00Z'),
      },
      {
        type: 'japan-news-fetch',
        message: 'Google News RSS取得失敗',
        timestamp: new Date('2026-01-02T08:00:01Z'),
      },
    ],
  });

  const createRetryResult = (): NewsBatchRetryResult => ({
    success: false,
    partialSuccess: false,
    finalResult: createFailedBatchResult(),
    attemptCount: 4,
    totalRetries: 3,
    totalProcessingTimeMs: 5000,
    exceptionOccurred: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new NewsBatchErrorLogger();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Firestoreへのログ保存', () => {
    it('失敗時にFirestore error_logsコレクションに保存する', async () => {
      await logger.logFinalFailure(createRetryResult());

      expect(mockFirestore.collection).toHaveBeenCalledWith('error_logs');
      expect(mockFirestore.add).toHaveBeenCalled();
    });

    it('保存するドキュメントが正しい構造を持つ', async () => {
      await logger.logFinalFailure(createRetryResult());

      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;

      expect(savedDoc).toHaveProperty('batchType', 'news');
      expect(savedDoc).toHaveProperty('date');
      expect(savedDoc).toHaveProperty('attemptCount');
      expect(savedDoc).toHaveProperty('totalRetries');
      expect(savedDoc).toHaveProperty('errors');
      expect(savedDoc).toHaveProperty('timestamp');
    });
  });

  describe('エラー詳細の構造', () => {
    it('バッチ日付を含む', async () => {
      await logger.logFinalFailure(createRetryResult());

      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;
      expect(savedDoc.date).toBe('2026-01-02');
    });

    it('試行回数を含む', async () => {
      await logger.logFinalFailure(createRetryResult());

      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;
      expect(savedDoc.attemptCount).toBe(4);
      expect(savedDoc.totalRetries).toBe(3);
    });

    it('全てのエラーを含む', async () => {
      await logger.logFinalFailure(createRetryResult());

      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;
      expect(savedDoc.errors).toHaveLength(2);
      expect(savedDoc.errors[0].type).toBe('world-news-fetch');
      expect(savedDoc.errors[1].type).toBe('japan-news-fetch');
    });

    it('処理時間を含む', async () => {
      await logger.logFinalFailure(createRetryResult());

      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;
      expect(savedDoc.totalProcessingTimeMs).toBe(5000);
    });
  });

  describe('追加コンテキスト', () => {
    it('追加のコンテキスト情報を含めることができる', async () => {
      const context = {
        environment: 'production',
        triggeredBy: 'cron',
      };

      await logger.logFinalFailure(createRetryResult(), context);

      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;
      expect(savedDoc.context).toEqual(context);
    });
  });

  describe('タイムスタンプ', () => {
    it('保存時のタイムスタンプを記録する', async () => {
      const before = new Date();
      await logger.logFinalFailure(createRetryResult());
      const after = new Date();

      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;
      const timestamp = new Date(savedDoc.timestamp);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('例外処理', () => {
    it('Firestore保存失敗時にエラーログを出力する', async () => {
      mockFirestore.add.mockRejectedValueOnce(new Error('Firestore Error'));
      const consoleSpy = jest.spyOn(console, 'error');

      await logger.logFinalFailure(createRetryResult());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NewsBatchErrorLogger]'),
        expect.any(String)
      );
    });

    it('Firestore保存失敗時も例外をスローしない', async () => {
      mockFirestore.add.mockRejectedValueOnce(new Error('Firestore Error'));

      await expect(logger.logFinalFailure(createRetryResult())).resolves.not.toThrow();
    });
  });

  describe('コンソールログ', () => {
    it('保存成功時にログを出力する', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await logger.logFinalFailure(createRetryResult());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NewsBatchErrorLogger]'),
        expect.any(String)
      );
    });
  });

  describe('部分成功時の処理', () => {
    it('部分成功時もエラーログを保存できる', async () => {
      const partialResult: NewsBatchRetryResult = {
        success: false,
        partialSuccess: true,
        finalResult: {
          ...createFailedBatchResult(),
          partialSuccess: true,
          worldNews: {
            title: '世界ニュース',
            summary: '要約',
            characterCount: 2000,
            updatedAt: new Date(),
          },
        },
        attemptCount: 1,
        totalRetries: 0,
        totalProcessingTimeMs: 1000,
        exceptionOccurred: false,
      };

      await logger.logFinalFailure(partialResult);

      expect(mockFirestore.add).toHaveBeenCalled();
      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;
      expect(savedDoc.partialSuccess).toBe(true);
    });
  });

  describe('例外発生フラグ', () => {
    it('例外が発生した場合にフラグを記録する', async () => {
      const exceptionResult: NewsBatchRetryResult = {
        ...createRetryResult(),
        exceptionOccurred: true,
      };

      await logger.logFinalFailure(exceptionResult);

      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;
      expect(savedDoc.exceptionOccurred).toBe(true);
    });
  });

  describe('設定オプション', () => {
    it('コレクション名をカスタマイズできる', async () => {
      const customConfig: BatchErrorLogConfig = {
        collectionName: 'custom_error_logs',
      };
      const customLogger = new NewsBatchErrorLogger(customConfig);

      await customLogger.logFinalFailure(createRetryResult());

      expect(mockFirestore.collection).toHaveBeenCalledWith('custom_error_logs');
    });
  });

  describe('BatchErrorLogEntry型', () => {
    it('エントリが必須フィールドを持つ', async () => {
      await logger.logFinalFailure(createRetryResult());

      const savedDoc = mockFirestore.add.mock.calls[0][0] as BatchErrorLogEntry;

      expect(typeof savedDoc.batchType).toBe('string');
      expect(typeof savedDoc.date).toBe('string');
      expect(typeof savedDoc.attemptCount).toBe('number');
      expect(typeof savedDoc.totalRetries).toBe('number');
      expect(Array.isArray(savedDoc.errors)).toBe(true);
      expect(savedDoc.timestamp).toBeDefined();
    });
  });
});
