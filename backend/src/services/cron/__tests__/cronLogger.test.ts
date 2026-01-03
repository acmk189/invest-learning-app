/**
 * Cronログ機能のテスト
 *
 * Task 13.3: Cronタイムアウト・ログ設定
 *
 * Cron Jobsの実行ログと処理時間計測のテスト
 *
 * Requirements:
 * - 1.8 (5分以内にバッチ完了)
 * - 11.3 (エラー発生時詳細ログ)
 */

import {
  CronLogger,
  CronLogEntry,
  CronLogLevel,
  formatDuration,
  CRON_TIMEOUT_MS,
  CRON_TIMEOUT_WARNING_MS,
} from '../cronLogger';

describe('cronLogger', () => {
  describe('CronLogger', () => {
    let logger: CronLogger;
    let consoleSpy: {
      log: jest.SpyInstance;
      warn: jest.SpyInstance;
      error: jest.SpyInstance;
    };

    beforeEach(() => {
      logger = new CronLogger('test-job');
      consoleSpy = {
        log: jest.spyOn(console, 'log').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation(),
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('start', () => {
      it('開始時刻を記録', () => {
        logger.start();
        expect(logger.getStartTime()).toBeDefined();
        expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('[test-job] Starting')
        );
      });
    });

    describe('end', () => {
      it('終了時刻と処理時間を記録', () => {
        logger.start();
        const summary = logger.end();

        expect(summary.jobName).toBe('test-job');
        expect(summary.durationMs).toBeGreaterThanOrEqual(0);
        expect(summary.success).toBe(true);
      });

      it('開始せずに終了するとエラー', () => {
        expect(() => logger.end()).toThrow('Logger not started');
      });
    });

    describe('log', () => {
      it('infoレベルのログを出力', () => {
        logger.start();
        logger.log('info', 'Test message');

        expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('[test-job] Test message')
        );
      });

      it('warnレベルのログを出力', () => {
        logger.start();
        logger.log('warn', 'Warning message');

        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('[test-job] Warning message')
        );
      });

      it('errorレベルのログを出力', () => {
        logger.start();
        logger.log('error', 'Error message');

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[test-job] Error message')
        );
      });
    });

    describe('logStep', () => {
      it('ステップ完了を記録', () => {
        logger.start();
        logger.logStep('fetch-news', true, 100);

        expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('fetch-news')
        );
        expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining('100ms')
        );
      });

      it('ステップ失敗を記録', () => {
        logger.start();
        logger.logStep('fetch-news', false, 50, 'Connection timeout');

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('fetch-news')
        );
        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('Connection timeout')
        );
      });
    });

    describe('checkTimeout', () => {
      it('タイムアウト前は警告なし', () => {
        logger.start();
        const isTimedOut = logger.checkTimeout();

        expect(isTimedOut).toBe(false);
      });

      it('警告閾値を超えると警告ログ', () => {
        logger.start();
        // 強制的に時間経過をシミュレート
        (logger as unknown as { startTime: number }).startTime =
          Date.now() - CRON_TIMEOUT_WARNING_MS - 1000;

        logger.checkTimeout();

        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('approaching timeout')
        );
      });
    });

    describe('getEntries', () => {
      it('記録されたエントリーを取得', () => {
        logger.start();
        logger.log('info', 'First message');
        logger.log('warn', 'Second message');

        const entries = logger.getEntries();
        expect(entries).toHaveLength(3); // start + 2 logs
        expect(entries[1].message).toBe('First message');
        expect(entries[2].level).toBe('warn');
      });
    });
  });

  describe('formatDuration', () => {
    it('ミリ秒をフォーマット', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(300000)).toBe('5m 0s');
    });
  });

  describe('constants', () => {
    it('タイムアウトは5分（300秒）', () => {
      expect(CRON_TIMEOUT_MS).toBe(300000);
    });

    it('警告閾値は4分（240秒）', () => {
      expect(CRON_TIMEOUT_WARNING_MS).toBe(240000);
    });
  });
});
