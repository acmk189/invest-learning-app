/**
 * 用語バッチステップロガーテスト
 *
 * Task 12.2: 用語ステップ別エラーログ記録
 *
 * バッチ処理の各ステップでのエラーを詳細に記録する機能をテスト
 *
 * Requirements:
 * - 8.5 (外部API障害時エラーハンドリング+ログ)
 * - 11.3 (エラー発生時詳細ログ)
 */

import {
  TermsBatchStepLogger,
  TermsBatchStep,
  StepLogEntry,
} from '../termsBatchStepLogger';
import { BatchErrorInfo } from '../termsBatchService';

describe('TermsBatchStepLogger', () => {
  let logger: TermsBatchStepLogger;

  beforeEach(() => {
    logger = new TermsBatchStepLogger();
  });

  describe('logStepSuccess', () => {
    it('成功ログを記録できる', () => {
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_BEGINNER);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].step).toBe(TermsBatchStep.TERM_GENERATION_BEGINNER);
      expect(logs[0].success).toBe(true);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('メタデータ付きで成功ログを記録できる', () => {
      const metadata = { termName: 'テスト用語', difficulty: 'beginner' };
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_BEGINNER, metadata);

      const logs = logger.getLogs();
      expect(logs[0].metadata).toEqual(metadata);
    });
  });

  describe('logStepError', () => {
    it('エラーログを記録できる', () => {
      const error: BatchErrorInfo = {
        type: 'term-generation-beginner',
        message: '用語生成に失敗しました',
        timestamp: new Date(),
      };

      logger.logStepError(TermsBatchStep.TERM_GENERATION_BEGINNER, error);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].step).toBe(TermsBatchStep.TERM_GENERATION_BEGINNER);
      expect(logs[0].success).toBe(false);
      expect(logs[0].error).toEqual(error);
    });
  });

  describe('logErrorsFromBatchResult', () => {
    it('バッチ結果のエラーを一括登録できる', () => {
      const errors: BatchErrorInfo[] = [
        {
          type: 'term-generation-beginner',
          message: '初級用語生成失敗',
          timestamp: new Date(),
        },
        {
          type: 'firestore-save',
          message: 'Firestore保存失敗',
          timestamp: new Date(),
        },
      ];

      logger.logErrorsFromBatchResult(errors);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].step).toBe(TermsBatchStep.TERM_GENERATION_BEGINNER);
      expect(logs[1].step).toBe(TermsBatchStep.FIRESTORE_SAVE);
    });

    it('不明なエラータイプはUNKNOWNにマッピングされる', () => {
      const errors: BatchErrorInfo[] = [
        {
          type: 'unknown-error-type',
          message: '不明なエラー',
          timestamp: new Date(),
        },
      ];

      logger.logErrorsFromBatchResult(errors);

      const logs = logger.getLogs();
      expect(logs[0].step).toBe(TermsBatchStep.UNKNOWN);
    });
  });

  describe('getLogs', () => {
    it('すべてのログを取得できる', () => {
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_BEGINNER);
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_INTERMEDIATE);
      logger.logStepError(TermsBatchStep.TERM_GENERATION_ADVANCED, {
        type: 'term-generation-advanced',
        message: 'エラー',
        timestamp: new Date(),
      });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(3);
    });

    it('元の配列を変更しても影響しない（コピーを返す）', () => {
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_BEGINNER);
      const logs = logger.getLogs();
      logs.push({} as StepLogEntry);

      expect(logger.getLogs()).toHaveLength(1);
    });
  });

  describe('getLogsByStep', () => {
    it('特定のステップのログのみを取得できる', () => {
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_BEGINNER);
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_INTERMEDIATE);
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_BEGINNER);

      const logs = logger.getLogsByStep(TermsBatchStep.TERM_GENERATION_BEGINNER);
      expect(logs).toHaveLength(2);
      logs.forEach((log) => {
        expect(log.step).toBe(TermsBatchStep.TERM_GENERATION_BEGINNER);
      });
    });
  });

  describe('getErrorLogs', () => {
    it('エラーログのみを取得できる', () => {
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_BEGINNER);
      logger.logStepError(TermsBatchStep.TERM_GENERATION_INTERMEDIATE, {
        type: 'term-generation-intermediate',
        message: 'エラー',
        timestamp: new Date(),
      });
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_ADVANCED);

      const errorLogs = logger.getErrorLogs();
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].success).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('ログサマリーを取得できる', () => {
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_BEGINNER);
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_INTERMEDIATE);
      logger.logStepError(TermsBatchStep.TERM_GENERATION_ADVANCED, {
        type: 'term-generation-advanced',
        message: 'エラー',
        timestamp: new Date(),
      });

      const summary = logger.getSummary();

      expect(summary.totalSteps).toBe(3);
      expect(summary.successCount).toBe(2);
      expect(summary.errorCount).toBe(1);
      expect(summary.successfulSteps).toContain(TermsBatchStep.TERM_GENERATION_BEGINNER);
      expect(summary.successfulSteps).toContain(TermsBatchStep.TERM_GENERATION_INTERMEDIATE);
      expect(summary.failedSteps).toContain(TermsBatchStep.TERM_GENERATION_ADVANCED);
    });
  });

  describe('clear', () => {
    it('ログをクリアできる', () => {
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_BEGINNER);
      logger.logStepSuccess(TermsBatchStep.TERM_GENERATION_INTERMEDIATE);

      logger.clear();

      expect(logger.getLogs()).toHaveLength(0);
    });
  });
});
