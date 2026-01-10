/**
 * バッチ処理パフォーマンステスト
 *
 * Task 27.1: 並列実行最適化
 * Task 27.2: Claude APIタイムアウト最適化
 *
 * Requirements: 1.8 (5分以内にバッチ完了)
 */

import {
  ParallelFetchOptimizer,
  ParallelFetchConfig,
} from '../parallelFetchOptimizer';
import {
  ClaudeTimeoutOptimizer,
  ClaudeTimeoutConfig,
} from '../claudeTimeoutOptimizer';
import { BatchPerformanceMonitor, PerformanceMetrics } from '../batchPerformanceMonitor';

describe('Task 27.1: ParallelFetchOptimizer - 並列実行最適化', () => {
  describe('並列実行の基本動作', () => {
    it('2つのPromiseを並列実行できること', async () => {
      const optimizer = new ParallelFetchOptimizer();

      const task1 = () => new Promise<string>((resolve) =>
        setTimeout(() => resolve('result1'), 50)
      );
      const task2 = () => new Promise<string>((resolve) =>
        setTimeout(() => resolve('result2'), 50)
      );

      const startTime = Date.now();
      const result = await optimizer.executeParallel(task1, task2);
      const duration = Date.now() - startTime;

      // 並列実行なので、100ms未満で完了するはず
      expect(duration).toBeLessThan(100);
      expect(result.result1).toBe('result1');
      expect(result.result2).toBe('result2');
      expect(result.success).toBe(true);
    });

    it('タスクの処理時間を計測できること', async () => {
      const optimizer = new ParallelFetchOptimizer();

      const task1 = () => new Promise<string>((resolve) =>
        setTimeout(() => resolve('fast'), 30)
      );
      const task2 = () => new Promise<string>((resolve) =>
        setTimeout(() => resolve('slow'), 80)
      );

      const result = await optimizer.executeParallel(task1, task2);

      expect(result.timing.task1DurationMs).toBeGreaterThanOrEqual(30);
      expect(result.timing.task1DurationMs).toBeLessThan(50);
      expect(result.timing.task2DurationMs).toBeGreaterThanOrEqual(80);
      expect(result.timing.task2DurationMs).toBeLessThan(100);
      expect(result.timing.totalDurationMs).toBeGreaterThanOrEqual(80);
      expect(result.timing.totalDurationMs).toBeLessThan(120);
    });
  });

  describe('タイムアウト制御', () => {
    it('設定されたタイムアウト内でタスクを完了すること', async () => {
      const config: ParallelFetchConfig = {
        task1TimeoutMs: 100,
        task2TimeoutMs: 100,
      };
      const optimizer = new ParallelFetchOptimizer(config);

      const task1 = () => new Promise<string>((resolve) =>
        setTimeout(() => resolve('quick'), 30)
      );
      const task2 = () => new Promise<string>((resolve) =>
        setTimeout(() => resolve('quick'), 30)
      );

      const result = await optimizer.executeParallel(task1, task2);

      expect(result.success).toBe(true);
      expect(result.task1TimedOut).toBe(false);
      expect(result.task2TimedOut).toBe(false);
    });

    it('タイムアウトしたタスクは失敗として処理されること', async () => {
      const config: ParallelFetchConfig = {
        task1TimeoutMs: 50,
        task2TimeoutMs: 200,
      };
      const optimizer = new ParallelFetchOptimizer(config);

      const task1 = () => new Promise<string>((resolve) =>
        setTimeout(() => resolve('slow'), 100)
      );
      const task2 = () => new Promise<string>((resolve) =>
        setTimeout(() => resolve('fast'), 30)
      );

      const result = await optimizer.executeParallel(task1, task2);

      expect(result.task1TimedOut).toBe(true);
      expect(result.task2TimedOut).toBe(false);
      expect(result.result1).toBeUndefined();
      expect(result.result2).toBe('fast');
      expect(result.success).toBe(false);
      expect(result.partialSuccess).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('片方のタスクが失敗しても他方は成功すること', async () => {
      const optimizer = new ParallelFetchOptimizer();

      const task1 = () => Promise.reject(new Error('Task 1 failed'));
      const task2 = () => Promise.resolve('success');

      const result = await optimizer.executeParallel(task1, task2);

      expect(result.success).toBe(false);
      expect(result.partialSuccess).toBe(true);
      expect(result.result1).toBeUndefined();
      expect(result.result2).toBe('success');
      expect(result.error1?.message).toBe('Task 1 failed');
    });

    it('両方のタスクが失敗した場合は完全失敗となること', async () => {
      const optimizer = new ParallelFetchOptimizer();

      const task1 = () => Promise.reject(new Error('Task 1 failed'));
      const task2 = () => Promise.reject(new Error('Task 2 failed'));

      const result = await optimizer.executeParallel(task1, task2);

      expect(result.success).toBe(false);
      expect(result.partialSuccess).toBe(false);
      expect(result.result1).toBeUndefined();
      expect(result.result2).toBeUndefined();
      expect(result.error1?.message).toBe('Task 1 failed');
      expect(result.error2?.message).toBe('Task 2 failed');
    });
  });

  describe('設定', () => {
    it('デフォルトのタイムアウト設定を取得できること', () => {
      const optimizer = new ParallelFetchOptimizer();
      const config = optimizer.getConfig();

      // デフォルトタイムアウトは30秒(各タスク)
      expect(config.task1TimeoutMs).toBe(30000);
      expect(config.task2TimeoutMs).toBe(30000);
    });

    it('カスタムタイムアウト設定を適用できること', () => {
      const customConfig: ParallelFetchConfig = {
        task1TimeoutMs: 15000,
        task2TimeoutMs: 20000,
      };
      const optimizer = new ParallelFetchOptimizer(customConfig);
      const config = optimizer.getConfig();

      expect(config.task1TimeoutMs).toBe(15000);
      expect(config.task2TimeoutMs).toBe(20000);
    });
  });
});

describe('Task 27.2: ClaudeTimeoutOptimizer - タイムアウト最適化', () => {
  describe('タイムアウト設定', () => {
    it('デフォルトタイムアウトを適用できること', () => {
      const optimizer = new ClaudeTimeoutOptimizer();
      const options = optimizer.getOptimizedOptions();

      // デフォルトタイムアウトは60秒
      expect(options.timeoutMs).toBe(60000);
    });

    it('カスタムタイムアウトを設定できること', () => {
      const config: ClaudeTimeoutConfig = {
        defaultTimeoutMs: 45000,
      };
      const optimizer = new ClaudeTimeoutOptimizer(config);
      const options = optimizer.getOptimizedOptions();

      expect(options.timeoutMs).toBe(45000);
    });

    it('操作タイプごとに異なるタイムアウトを取得できること', () => {
      const config: ClaudeTimeoutConfig = {
        defaultTimeoutMs: 60000,
        operationTimeouts: {
          'news-summary': 90000,
          'term-generation': 45000,
        },
      };
      const optimizer = new ClaudeTimeoutOptimizer(config);

      const newsOptions = optimizer.getOptimizedOptions('news-summary');
      const termOptions = optimizer.getOptimizedOptions('term-generation');
      const otherOptions = optimizer.getOptimizedOptions('other-operation');

      expect(newsOptions.timeoutMs).toBe(90000);
      expect(termOptions.timeoutMs).toBe(45000);
      expect(otherOptions.timeoutMs).toBe(60000);
    });
  });

  describe('タイムアウト検出', () => {
    it('タイムアウトエラーを正しく検出できること', () => {
      const optimizer = new ClaudeTimeoutOptimizer();

      const timeoutError = new Error('Request timed out');
      const networkError = new Error('Network error');
      const apiError = new Error('API rate limit exceeded');

      expect(optimizer.isTimeoutError(timeoutError)).toBe(true);
      expect(optimizer.isTimeoutError(networkError)).toBe(false);
      expect(optimizer.isTimeoutError(apiError)).toBe(false);
    });

    it('AbortErrorをタイムアウトとして検出できること', () => {
      const optimizer = new ClaudeTimeoutOptimizer();

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      expect(optimizer.isTimeoutError(abortError)).toBe(true);
    });
  });

  describe('長時間待機防止', () => {
    it('最大タイムアウトを超えないこと', () => {
      const config: ClaudeTimeoutConfig = {
        defaultTimeoutMs: 300000, // 5分を超える設定
        maxTimeoutMs: 120000, // 最大2分
      };
      const optimizer = new ClaudeTimeoutOptimizer(config);
      const options = optimizer.getOptimizedOptions();

      // 最大タイムアウトで制限される
      expect(options.timeoutMs).toBe(120000);
    });

    it('最小タイムアウトを下回らないこと', () => {
      const config: ClaudeTimeoutConfig = {
        defaultTimeoutMs: 1000, // 1秒(短すぎる)
        minTimeoutMs: 10000, // 最小10秒
      };
      const optimizer = new ClaudeTimeoutOptimizer(config);
      const options = optimizer.getOptimizedOptions();

      // 最小タイムアウトで制限される
      expect(options.timeoutMs).toBe(10000);
    });
  });

  describe('リトライ設定', () => {
    it('タイムアウト時のリトライ設定を取得できること', () => {
      const config: ClaudeTimeoutConfig = {
        defaultTimeoutMs: 60000,
        retryOnTimeout: true,
        maxRetries: 2,
      };
      const optimizer = new ClaudeTimeoutOptimizer(config);
      const options = optimizer.getOptimizedOptions();

      expect(options.retryOnTimeout).toBe(true);
      expect(options.maxRetries).toBe(2);
    });

    it('リトライ無効時の設定を取得できること', () => {
      const config: ClaudeTimeoutConfig = {
        defaultTimeoutMs: 60000,
        retryOnTimeout: false,
      };
      const optimizer = new ClaudeTimeoutOptimizer(config);
      const options = optimizer.getOptimizedOptions();

      expect(options.retryOnTimeout).toBe(false);
      expect(options.maxRetries).toBe(0);
    });
  });
});

describe('BatchPerformanceMonitor - パフォーマンス監視', () => {
  describe('処理時間計測', () => {
    it('バッチ処理全体の時間を計測できること', () => {
      const monitor = new BatchPerformanceMonitor();

      monitor.startBatch();
      // 処理をシミュレート
      const startTime = Date.now();
      while (Date.now() - startTime < 50) {
        // 50ms待機
      }
      const metrics = monitor.endBatch();

      expect(metrics.totalDurationMs).toBeGreaterThanOrEqual(50);
      expect(metrics.totalDurationMs).toBeLessThan(100);
    });

    it('各ステップの処理時間を記録できること', () => {
      const monitor = new BatchPerformanceMonitor();

      monitor.startBatch();

      monitor.startStep('fetch-news');
      // フェッチ処理をシミュレート
      let startTime = Date.now();
      while (Date.now() - startTime < 30) {
        // ビジーウェイト
      }
      monitor.endStep('fetch-news');

      monitor.startStep('summarize');
      // 要約処理をシミュレート
      startTime = Date.now();
      while (Date.now() - startTime < 20) {
        // ビジーウェイト
      }
      monitor.endStep('summarize');

      const metrics = monitor.endBatch();

      expect(metrics.steps['fetch-news']).toBeGreaterThanOrEqual(30);
      expect(metrics.steps['summarize']).toBeGreaterThanOrEqual(20);
    });
  });

  describe('5分タイムアウト検証', () => {
    it('処理時間が5分以内かどうかを検証できること', () => {
      // 5分以内
      const metricsOk: PerformanceMetrics = {
        totalDurationMs: 240000, // 4分
        steps: {},
        isWithinLimit: true,
        limitMs: 300000,
      };

      // 5分超過
      const metricsNg: PerformanceMetrics = {
        totalDurationMs: 360000, // 6分
        steps: {},
        isWithinLimit: false,
        limitMs: 300000,
      };

      expect(metricsOk.isWithinLimit).toBe(true);
      expect(metricsNg.isWithinLimit).toBe(false);
    });

    it('残り時間を取得できること', () => {
      const monitor = new BatchPerformanceMonitor();

      monitor.startBatch();
      const remaining = monitor.getRemainingTime();

      // 開始直後なので、ほぼ5分残っている
      expect(remaining).toBeGreaterThan(299000);
      expect(remaining).toBeLessThanOrEqual(300000);
    });
  });

  describe('ログ出力', () => {
    it('パフォーマンスサマリーをログ形式で出力できること', () => {
      const monitor = new BatchPerformanceMonitor();

      monitor.startBatch();
      monitor.startStep('step1');
      monitor.endStep('step1');
      const metrics = monitor.endBatch();

      const logEntry = monitor.getLogEntry();

      expect(logEntry.batchId).toBeDefined();
      expect(logEntry.totalDurationMs).toBe(metrics.totalDurationMs);
      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.steps).toHaveProperty('step1');
    });
  });
});
