/**
 * トークン使用量監視機能のテスト
 *
 * Requirements: 10.3
 *
 * API呼び出しごとのトークン使用量を記録し、
 * 累積トークン使用量をログに出力する機能のテストを行います。
 */

import {
  TokenUsageTracker,
  TokenUsageRecord,
  TokenUsageSummary,
  getTokenUsageTracker,
  resetTokenUsageTracker,
} from '../tokenUsageTracker';

describe('TokenUsageTracker', () => {
  let tracker: TokenUsageTracker;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // シングルトンをリセット
    resetTokenUsageTracker();
    tracker = getTokenUsageTracker();

    // console.logをモック
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    resetTokenUsageTracker();
  });

  describe('型定義', () => {
    it('TokenUsageRecordが正しいプロパティを持つ', () => {
      const record: TokenUsageRecord = {
        timestamp: new Date(),
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'test-operation',
      };

      expect(record.timestamp).toBeInstanceOf(Date);
      expect(typeof record.inputTokens).toBe('number');
      expect(typeof record.outputTokens).toBe('number');
      expect(typeof record.model).toBe('string');
      expect(typeof record.operation).toBe('string');
    });

    it('TokenUsageSummaryが正しいプロパティを持つ', () => {
      const summary: TokenUsageSummary = {
        totalInputTokens: 1000,
        totalOutputTokens: 2000,
        totalTokens: 3000,
        requestCount: 10,
        recordsByModel: {
          'claude-haiku-4-5': {
            inputTokens: 500,
            outputTokens: 1000,
            count: 5,
          },
          'claude-sonnet-4-5': {
            inputTokens: 500,
            outputTokens: 1000,
            count: 5,
          },
        },
      };

      expect(typeof summary.totalInputTokens).toBe('number');
      expect(typeof summary.totalOutputTokens).toBe('number');
      expect(typeof summary.totalTokens).toBe('number');
      expect(typeof summary.requestCount).toBe('number');
      expect(summary.recordsByModel).toBeDefined();
    });
  });

  describe('recordUsage', () => {
    it('トークン使用量を記録できる', () => {
      tracker.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'news-summary',
      });

      const records = tracker.getRecords();
      expect(records).toHaveLength(1);
      expect(records[0].inputTokens).toBe(100);
      expect(records[0].outputTokens).toBe(200);
      expect(records[0].model).toBe('claude-haiku-4-5');
      expect(records[0].operation).toBe('news-summary');
    });

    it('複数のトークン使用量を記録できる', () => {
      tracker.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'news-summary',
      });

      tracker.recordUsage({
        inputTokens: 150,
        outputTokens: 300,
        model: 'claude-sonnet-4-5',
        operation: 'term-generation',
      });

      const records = tracker.getRecords();
      expect(records).toHaveLength(2);
    });

    it('タイムスタンプが自動的に設定される', () => {
      const beforeRecord = new Date();

      tracker.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'test',
      });

      const afterRecord = new Date();
      const records = tracker.getRecords();

      expect(records[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeRecord.getTime()
      );
      expect(records[0].timestamp.getTime()).toBeLessThanOrEqual(
        afterRecord.getTime()
      );
    });
  });

  describe('getSummary', () => {
    it('累積トークン使用量を正しく計算する', () => {
      tracker.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'test',
      });

      tracker.recordUsage({
        inputTokens: 150,
        outputTokens: 300,
        model: 'claude-haiku-4-5',
        operation: 'test',
      });

      const summary = tracker.getSummary();

      expect(summary.totalInputTokens).toBe(250);
      expect(summary.totalOutputTokens).toBe(500);
      expect(summary.totalTokens).toBe(750);
      expect(summary.requestCount).toBe(2);
    });

    it('モデル別のトークン使用量を集計する', () => {
      tracker.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'test',
      });

      tracker.recordUsage({
        inputTokens: 150,
        outputTokens: 300,
        model: 'claude-sonnet-4-5',
        operation: 'test',
      });

      tracker.recordUsage({
        inputTokens: 50,
        outputTokens: 100,
        model: 'claude-haiku-4-5',
        operation: 'test',
      });

      const summary = tracker.getSummary();

      expect(summary.recordsByModel['claude-haiku-4-5']).toEqual({
        inputTokens: 150,
        outputTokens: 300,
        count: 2,
      });

      expect(summary.recordsByModel['claude-sonnet-4-5']).toEqual({
        inputTokens: 150,
        outputTokens: 300,
        count: 1,
      });
    });

    it('記録がない場合は0を返す', () => {
      const summary = tracker.getSummary();

      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.totalTokens).toBe(0);
      expect(summary.requestCount).toBe(0);
    });
  });

  describe('logSummary', () => {
    it('累積トークン使用量をログに出力する', () => {
      tracker.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'test',
      });

      tracker.logSummary();

      expect(consoleSpy).toHaveBeenCalled();
      // ログ出力に必要な情報が含まれていることを確認
      const logCalls = consoleSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');
      expect(logCalls).toContain('100'); // inputTokens
      expect(logCalls).toContain('200'); // outputTokens
      expect(logCalls).toContain('300'); // totalTokens
    });

    it('ログ出力にはモデル別の集計が含まれる', () => {
      tracker.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'test',
      });

      tracker.recordUsage({
        inputTokens: 150,
        outputTokens: 300,
        model: 'claude-sonnet-4-5',
        operation: 'test',
      });

      tracker.logSummary();

      const logCalls = consoleSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');
      expect(logCalls).toContain('claude-haiku-4-5');
      expect(logCalls).toContain('claude-sonnet-4-5');
    });
  });

  describe('logUsage', () => {
    it('個別のトークン使用量をログに出力する', () => {
      tracker.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'news-summary',
      });

      tracker.logUsage(tracker.getRecords()[0]);

      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');
      expect(logCalls).toContain('100');
      expect(logCalls).toContain('200');
      expect(logCalls).toContain('news-summary');
    });
  });

  describe('reset', () => {
    it('すべての記録をクリアする', () => {
      tracker.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'test',
      });

      expect(tracker.getRecords()).toHaveLength(1);

      tracker.reset();

      expect(tracker.getRecords()).toHaveLength(0);
      expect(tracker.getSummary().totalTokens).toBe(0);
    });
  });

  describe('getTokenUsageTracker', () => {
    it('シングルトンパターンで同じインスタンスを返す', () => {
      const tracker1 = getTokenUsageTracker();
      const tracker2 = getTokenUsageTracker();

      expect(tracker1).toBe(tracker2);
    });
  });

  describe('resetTokenUsageTracker', () => {
    it('シングルトンインスタンスをリセットする', () => {
      const tracker1 = getTokenUsageTracker();
      tracker1.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        model: 'claude-haiku-4-5',
        operation: 'test',
      });

      resetTokenUsageTracker();

      const tracker2 = getTokenUsageTracker();
      expect(tracker2.getRecords()).toHaveLength(0);
    });
  });
});
