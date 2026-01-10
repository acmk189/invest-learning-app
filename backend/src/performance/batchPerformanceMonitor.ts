/**
 * バッチ処理パフォーマンス監視
 *
 * Task 27.1, 27.2, 27.3 共通
 *
 * バッチ処理の各ステップの処理時間を計測し、
 * 5分以内に完了しているかを検証します。
 *
 * Requirements: 1.8 (5分以内にバッチ完了)
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * デフォルトのバッチ処理制限時間（5分）
 */
const DEFAULT_BATCH_LIMIT_MS = 300000;

/**
 * パフォーマンスメトリクス
 *
 * バッチ処理全体と各ステップの処理時間を記録
 */
export interface PerformanceMetrics {
  /** 全体の処理時間（ミリ秒） */
  totalDurationMs: number;
  /** 各ステップの処理時間（キー: ステップ名, 値: ミリ秒） */
  steps: Record<string, number>;
  /** 制限時間内に完了したか */
  isWithinLimit: boolean;
  /** 制限時間（ミリ秒） */
  limitMs: number;
}

/**
 * パフォーマンスログエントリ
 *
 * ログ出力用の構造化データ
 */
export interface PerformanceLogEntry {
  /** バッチID（一意識別子） */
  batchId: string;
  /** 全体の処理時間（ミリ秒） */
  totalDurationMs: number;
  /** 各ステップの処理時間 */
  steps: Record<string, number>;
  /** 制限時間内に完了したか */
  isWithinLimit: boolean;
  /** ログ記録時刻 */
  timestamp: string;
}

/**
 * バッチパフォーマンスモニター設定
 */
export interface BatchPerformanceMonitorConfig {
  /**
   * バッチ処理の制限時間（ミリ秒）
   * @default 300000 (5分)
   */
  limitMs?: number;
}

/**
 * バッチ処理パフォーマンス監視クラス
 *
 * バッチ処理全体と各ステップの処理時間を計測し、
 * 5分制限の検証を行います。
 *
 * @example
 * const monitor = new BatchPerformanceMonitor();
 *
 * monitor.startBatch();
 *
 * monitor.startStep('fetch-news');
 * await fetchNews();
 * monitor.endStep('fetch-news');
 *
 * monitor.startStep('summarize');
 * await summarizeNews();
 * monitor.endStep('summarize');
 *
 * const metrics = monitor.endBatch();
 * console.log(`Total: ${metrics.totalDurationMs}ms`);
 * console.log(`Within limit: ${metrics.isWithinLimit}`);
 */
export class BatchPerformanceMonitor {
  private readonly limitMs: number;
  private readonly batchId: string;
  private batchStartTime: number | null = null;
  private batchEndTime: number | null = null;
  private stepStartTimes: Record<string, number> = {};
  private stepDurations: Record<string, number> = {};

  /**
   * コンストラクタ
   *
   * @param config - 監視設定
   */
  constructor(config: BatchPerformanceMonitorConfig = {}) {
    this.limitMs = config.limitMs ?? DEFAULT_BATCH_LIMIT_MS;
    this.batchId = uuidv4();
  }

  /**
   * バッチ処理開始
   *
   * 処理時間の計測を開始します。
   */
  startBatch(): void {
    this.batchStartTime = Date.now();
    this.batchEndTime = null;
    this.stepStartTimes = {};
    this.stepDurations = {};

    console.log(`[BatchPerformanceMonitor] Batch ${this.batchId} started`);
  }

  /**
   * バッチ処理終了
   *
   * 処理時間の計測を終了し、メトリクスを返します。
   *
   * @returns パフォーマンスメトリクス
   * @throws {Error} バッチが開始されていない場合
   */
  endBatch(): PerformanceMetrics {
    if (this.batchStartTime === null) {
      throw new Error('Batch has not been started');
    }

    this.batchEndTime = Date.now();
    const totalDurationMs = this.batchEndTime - this.batchStartTime;
    const isWithinLimit = totalDurationMs <= this.limitMs;

    const metrics: PerformanceMetrics = {
      totalDurationMs,
      steps: { ...this.stepDurations },
      isWithinLimit,
      limitMs: this.limitMs,
    };

    console.log(
      `[BatchPerformanceMonitor] Batch ${this.batchId} completed in ${totalDurationMs}ms ` +
        `(${isWithinLimit ? 'within' : 'exceeded'} ${this.limitMs}ms limit)`
    );

    return metrics;
  }

  /**
   * ステップ処理開始
   *
   * 個別ステップの処理時間計測を開始します。
   *
   * @param stepName - ステップ名
   */
  startStep(stepName: string): void {
    this.stepStartTimes[stepName] = Date.now();
  }

  /**
   * ステップ処理終了
   *
   * 個別ステップの処理時間計測を終了します。
   *
   * @param stepName - ステップ名
   * @throws {Error} ステップが開始されていない場合
   */
  endStep(stepName: string): void {
    const startTime = this.stepStartTimes[stepName];
    if (startTime === undefined) {
      throw new Error(`Step '${stepName}' has not been started`);
    }

    const duration = Date.now() - startTime;
    this.stepDurations[stepName] = duration;

    console.log(
      `[BatchPerformanceMonitor] Step '${stepName}' completed in ${duration}ms`
    );
  }

  /**
   * 残り時間を取得
   *
   * バッチ処理の残り時間（ミリ秒）を返します。
   *
   * @returns 残り時間（ミリ秒）、バッチ未開始時は制限時間
   */
  getRemainingTime(): number {
    if (this.batchStartTime === null) {
      return this.limitMs;
    }

    const elapsed = Date.now() - this.batchStartTime;
    const remaining = this.limitMs - elapsed;

    return Math.max(remaining, 0);
  }

  /**
   * 制限時間を超過しているか
   *
   * @returns 超過している場合true
   */
  isOverLimit(): boolean {
    if (this.batchStartTime === null) {
      return false;
    }

    const elapsed = Date.now() - this.batchStartTime;
    return elapsed > this.limitMs;
  }

  /**
   * ログエントリを取得
   *
   * ログ出力用の構造化データを返します。
   *
   * @returns パフォーマンスログエントリ
   */
  getLogEntry(): PerformanceLogEntry {
    const totalDurationMs =
      this.batchStartTime !== null
        ? (this.batchEndTime ?? Date.now()) - this.batchStartTime
        : 0;

    return {
      batchId: this.batchId,
      totalDurationMs,
      steps: { ...this.stepDurations },
      isWithinLimit: totalDurationMs <= this.limitMs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * バッチIDを取得
   *
   * @returns バッチID
   */
  getBatchId(): string {
    return this.batchId;
  }

  /**
   * 設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): BatchPerformanceMonitorConfig {
    return {
      limitMs: this.limitMs,
    };
  }
}
