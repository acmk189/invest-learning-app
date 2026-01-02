/**
 * ニュースバッチステップ別エラーログのテスト
 *
 * Task 9.2: ニュースステップ別エラーログ記録
 *
 * Requirements:
 * - 8.5 (外部API障害時エラーハンドリング+ログ)
 * - 11.3 (エラー発生時詳細ログ)
 *
 * 各ステップでのエラーログ記録機能をテストする
 */

import {
  NewsBatchStepLogger,
  BatchStep,
  StepLogEntry,
  StepLogSummary,
} from '../newsBatchStepLogger';
import { BatchErrorInfo } from '../newsBatchService';

describe('NewsBatchStepLogger', () => {
  let logger: NewsBatchStepLogger;

  beforeEach(() => {
    logger = new NewsBatchStepLogger();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ステップの定義', () => {
    it('全てのバッチステップが定義されている', () => {
      expect(BatchStep.WORLD_NEWS_FETCH).toBe('world-news-fetch');
      expect(BatchStep.JAPAN_NEWS_FETCH).toBe('japan-news-fetch');
      expect(BatchStep.WORLD_NEWS_SUMMARY).toBe('world-news-summary');
      expect(BatchStep.JAPAN_NEWS_SUMMARY).toBe('japan-news-summary');
      expect(BatchStep.FIRESTORE_SAVE).toBe('firestore-save');
      expect(BatchStep.METADATA_UPDATE).toBe('metadata-update');
    });
  });

  describe('エラーログ記録', () => {
    it('ニュース取得ステップのエラーを記録できる', () => {
      const error: BatchErrorInfo = {
        type: 'world-news-fetch',
        message: 'NewsAPI接続エラー',
        timestamp: new Date(),
      };

      logger.logStepError(BatchStep.WORLD_NEWS_FETCH, error);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].step).toBe(BatchStep.WORLD_NEWS_FETCH);
      expect(logs[0].error?.message).toBe('NewsAPI接続エラー');
    });

    it('AI処理ステップのエラーを記録できる', () => {
      const error: BatchErrorInfo = {
        type: 'world-news-summary',
        message: 'Claude API タイムアウト',
        timestamp: new Date(),
      };

      logger.logStepError(BatchStep.WORLD_NEWS_SUMMARY, error);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].step).toBe(BatchStep.WORLD_NEWS_SUMMARY);
    });

    it('Firestore保存ステップのエラーを記録できる', () => {
      const error: BatchErrorInfo = {
        type: 'firestore-save',
        message: 'Firestore書き込み失敗',
        timestamp: new Date(),
      };

      logger.logStepError(BatchStep.FIRESTORE_SAVE, error);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].step).toBe(BatchStep.FIRESTORE_SAVE);
    });

    it('複数のステップエラーを記録できる', () => {
      const error1: BatchErrorInfo = {
        type: 'world-news-fetch',
        message: 'エラー1',
        timestamp: new Date(),
      };
      const error2: BatchErrorInfo = {
        type: 'japan-news-fetch',
        message: 'エラー2',
        timestamp: new Date(),
      };

      logger.logStepError(BatchStep.WORLD_NEWS_FETCH, error1);
      logger.logStepError(BatchStep.JAPAN_NEWS_FETCH, error2);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
    });
  });

  describe('ステップ成功の記録', () => {
    it('ステップの成功を記録できる', () => {
      logger.logStepSuccess(BatchStep.WORLD_NEWS_FETCH, { articleCount: 10 });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].step).toBe(BatchStep.WORLD_NEWS_FETCH);
      expect(logs[0].success).toBe(true);
      expect(logs[0].metadata?.articleCount).toBe(10);
    });
  });

  describe('ログサマリー', () => {
    it('空のログでサマリーを取得できる', () => {
      const summary = logger.getSummary();

      expect(summary.totalSteps).toBe(0);
      expect(summary.successCount).toBe(0);
      expect(summary.errorCount).toBe(0);
    });

    it('成功とエラーの件数を集計できる', () => {
      logger.logStepSuccess(BatchStep.WORLD_NEWS_FETCH);
      logger.logStepError(BatchStep.JAPAN_NEWS_FETCH, {
        type: 'japan-news-fetch',
        message: 'エラー',
        timestamp: new Date(),
      });
      logger.logStepSuccess(BatchStep.WORLD_NEWS_SUMMARY);

      const summary = logger.getSummary();

      expect(summary.totalSteps).toBe(3);
      expect(summary.successCount).toBe(2);
      expect(summary.errorCount).toBe(1);
    });

    it('エラーが発生したステップ一覧を取得できる', () => {
      logger.logStepError(BatchStep.WORLD_NEWS_FETCH, {
        type: 'world-news-fetch',
        message: 'エラー1',
        timestamp: new Date(),
      });
      logger.logStepError(BatchStep.JAPAN_NEWS_SUMMARY, {
        type: 'japan-news-summary',
        message: 'エラー2',
        timestamp: new Date(),
      });

      const summary = logger.getSummary();

      expect(summary.failedSteps).toContain(BatchStep.WORLD_NEWS_FETCH);
      expect(summary.failedSteps).toContain(BatchStep.JAPAN_NEWS_SUMMARY);
    });
  });

  describe('ログのフィルタリング', () => {
    it('特定のステップのログだけを取得できる', () => {
      logger.logStepSuccess(BatchStep.WORLD_NEWS_FETCH);
      logger.logStepError(BatchStep.JAPAN_NEWS_FETCH, {
        type: 'japan-news-fetch',
        message: 'エラー',
        timestamp: new Date(),
      });
      logger.logStepSuccess(BatchStep.WORLD_NEWS_SUMMARY);

      const fetchLogs = logger.getLogsByStep(BatchStep.JAPAN_NEWS_FETCH);

      expect(fetchLogs).toHaveLength(1);
      expect(fetchLogs[0].step).toBe(BatchStep.JAPAN_NEWS_FETCH);
    });

    it('エラーログだけを取得できる', () => {
      logger.logStepSuccess(BatchStep.WORLD_NEWS_FETCH);
      logger.logStepError(BatchStep.JAPAN_NEWS_FETCH, {
        type: 'japan-news-fetch',
        message: 'エラー',
        timestamp: new Date(),
      });

      const errorLogs = logger.getErrorLogs();

      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].success).toBe(false);
    });
  });

  describe('コンソールログ出力', () => {
    it('エラー記録時にコンソールにログを出力する', () => {
      const consoleSpy = jest.spyOn(console, 'error');

      logger.logStepError(BatchStep.WORLD_NEWS_FETCH, {
        type: 'world-news-fetch',
        message: 'テストエラー',
        timestamp: new Date(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NewsBatchStepLogger]'),
        expect.any(String)
      );
    });

    it('成功記録時にコンソールにログを出力する', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      logger.logStepSuccess(BatchStep.WORLD_NEWS_FETCH);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NewsBatchStepLogger]'),
        expect.any(String)
      );
    });
  });

  describe('BatchErrorInfoからの変換', () => {
    it('BatchErrorInfo配列からログを一括登録できる', () => {
      const errors: BatchErrorInfo[] = [
        {
          type: 'world-news-fetch',
          message: 'エラー1',
          timestamp: new Date(),
        },
        {
          type: 'japan-news-summary',
          message: 'エラー2',
          timestamp: new Date(),
        },
      ];

      logger.logErrorsFromBatchResult(errors);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
    });

    it('typeをステップに正しくマッピングする', () => {
      const errors: BatchErrorInfo[] = [
        {
          type: 'world-news-fetch',
          message: 'WorldFetchエラー',
          timestamp: new Date(),
        },
        {
          type: 'japan-news-fetch',
          message: 'JapanFetchエラー',
          timestamp: new Date(),
        },
        {
          type: 'world-news-summary',
          message: 'WorldSummaryエラー',
          timestamp: new Date(),
        },
        {
          type: 'japan-news-summary',
          message: 'JapanSummaryエラー',
          timestamp: new Date(),
        },
        {
          type: 'firestore-save',
          message: 'Firestoreエラー',
          timestamp: new Date(),
        },
        {
          type: 'metadata-update',
          message: 'Metadataエラー',
          timestamp: new Date(),
        },
      ];

      logger.logErrorsFromBatchResult(errors);

      const logs = logger.getLogs();
      expect(logs[0].step).toBe(BatchStep.WORLD_NEWS_FETCH);
      expect(logs[1].step).toBe(BatchStep.JAPAN_NEWS_FETCH);
      expect(logs[2].step).toBe(BatchStep.WORLD_NEWS_SUMMARY);
      expect(logs[3].step).toBe(BatchStep.JAPAN_NEWS_SUMMARY);
      expect(logs[4].step).toBe(BatchStep.FIRESTORE_SAVE);
      expect(logs[5].step).toBe(BatchStep.METADATA_UPDATE);
    });

    it('未知のtypeはUNKNOWNステップに分類する', () => {
      const errors: BatchErrorInfo[] = [
        {
          type: 'unknown-type',
          message: '不明なエラー',
          timestamp: new Date(),
        },
      ];

      logger.logErrorsFromBatchResult(errors);

      const logs = logger.getLogs();
      expect(logs[0].step).toBe(BatchStep.UNKNOWN);
    });
  });

  describe('ログのクリア', () => {
    it('ログをクリアできる', () => {
      logger.logStepSuccess(BatchStep.WORLD_NEWS_FETCH);
      logger.logStepSuccess(BatchStep.JAPAN_NEWS_FETCH);

      logger.clear();

      const logs = logger.getLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('タイムスタンプ', () => {
    it('ログにタイムスタンプが含まれる', () => {
      const before = new Date();
      logger.logStepSuccess(BatchStep.WORLD_NEWS_FETCH);
      const after = new Date();

      const logs = logger.getLogs();
      expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('ログエントリーの構造', () => {
    it('成功ログが正しい構造を持つ', () => {
      logger.logStepSuccess(BatchStep.WORLD_NEWS_FETCH, { details: 'test' });

      const logs = logger.getLogs();
      const log = logs[0];

      expect(log).toHaveProperty('step');
      expect(log).toHaveProperty('success');
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('metadata');
      expect(log.success).toBe(true);
    });

    it('エラーログが正しい構造を持つ', () => {
      logger.logStepError(BatchStep.WORLD_NEWS_FETCH, {
        type: 'world-news-fetch',
        message: 'エラー',
        timestamp: new Date(),
      });

      const logs = logger.getLogs();
      const log = logs[0];

      expect(log).toHaveProperty('step');
      expect(log).toHaveProperty('success');
      expect(log).toHaveProperty('error');
      expect(log).toHaveProperty('timestamp');
      expect(log.success).toBe(false);
    });
  });
});
