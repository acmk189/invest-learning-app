/**
 * 並列実行最適化
 *
 * Task 27.1: 並列実行最適化 - NewsAPIとGoogle News RSSの並列実行検証と処理時間短縮
 *
 * 2つの非同期タスク(ニュース取得等)を並列実行し、
 * 処理時間を最小化します。タイムアウト制御付きで
 * 個別タスクの失敗をハンドリングします。
 *
 * Requirements: 1.8 (5分以内にバッチ完了)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled - Promise.allSettled
 */

/**
 * デフォルトのタスクタイムアウト(30秒)
 *
 * NewsAPIとGoogle News RSSの取得は通常数秒で完了するため、
 * 30秒のタイムアウトで十分なマージンを確保
 */
const DEFAULT_TASK_TIMEOUT_MS = 30000;

/**
 * 並列実行設定
 *
 * 各タスクのタイムアウト時間を設定できます。
 */
export interface ParallelFetchConfig {
  /**
   * タスク1(例：NewsAPI)のタイムアウト時間(ミリ秒)
   * @default 30000
   */
  task1TimeoutMs?: number;

  /**
   * タスク2(例：Google News RSS)のタイムアウト時間(ミリ秒)
   * @default 30000
   */
  task2TimeoutMs?: number;
}

/**
 * タイミング情報
 *
 * 各タスクと全体の処理時間を記録
 */
export interface ParallelFetchTiming {
  /** タスク1の処理時間(ミリ秒) */
  task1DurationMs: number;
  /** タスク2の処理時間(ミリ秒) */
  task2DurationMs: number;
  /** 全体の処理時間(ミリ秒) */
  totalDurationMs: number;
}

/**
 * 並列実行結果
 *
 * @template T1 - タスク1の結果型
 * @template T2 - タスク2の結果型
 */
export interface ParallelFetchResult<T1 = unknown, T2 = unknown> {
  /** 全てのタスクが成功したか */
  success: boolean;
  /** 部分的に成功したか(片方のみ成功) */
  partialSuccess: boolean;
  /** タスク1の結果(成功時) */
  result1?: T1;
  /** タスク2の結果(成功時) */
  result2?: T2;
  /** タスク1がタイムアウトしたか */
  task1TimedOut: boolean;
  /** タスク2がタイムアウトしたか */
  task2TimedOut: boolean;
  /** タスク1のエラー(失敗時) */
  error1?: Error;
  /** タスク2のエラー(失敗時) */
  error2?: Error;
  /** タイミング情報 */
  timing: ParallelFetchTiming;
}

/**
 * タイムアウト付きPromise実行結果
 */
interface TimeoutResult<T> {
  result?: T;
  error?: Error;
  timedOut: boolean;
  durationMs: number;
}

/**
 * 並列実行最適化クラス
 *
 * 2つの非同期タスクを並列実行し、個別のタイムアウト制御と
 * エラーハンドリングを提供します。
 *
 * @example
 * const optimizer = new ParallelFetchOptimizer({
 *   task1TimeoutMs: 15000,
 *   task2TimeoutMs: 20000,
 * });
 *
 * const result = await optimizer.executeParallel(
 *   () => fetchWorldNews(),
 *   () => fetchJapanNews()
 * );
 *
 * if (result.success) {
 *   console.log('両方成功:', result.result1, result.result2);
 * } else if (result.partialSuccess) {
 *   console.log('部分成功');
 * }
 */
export class ParallelFetchOptimizer {
  private readonly task1TimeoutMs: number;
  private readonly task2TimeoutMs: number;

  /**
   * コンストラクタ
   *
   * @param config - 並列実行設定
   */
  constructor(config: ParallelFetchConfig = {}) {
    this.task1TimeoutMs = config.task1TimeoutMs ?? DEFAULT_TASK_TIMEOUT_MS;
    this.task2TimeoutMs = config.task2TimeoutMs ?? DEFAULT_TASK_TIMEOUT_MS;
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): Required<ParallelFetchConfig> {
    return {
      task1TimeoutMs: this.task1TimeoutMs,
      task2TimeoutMs: this.task2TimeoutMs,
    };
  }

  /**
   * 2つのタスクを並列実行
   *
   * 両タスクを同時に開始し、それぞれ独立したタイムアウト制御を行います。
   * 片方が失敗しても、もう片方は実行を継続します。
   *
   * @template T1 - タスク1の結果型
   * @template T2 - タスク2の結果型
   * @param task1 - タスク1を実行する関数
   * @param task2 - タスク2を実行する関数
   * @returns 並列実行結果
   */
  async executeParallel<T1, T2>(
    task1: () => Promise<T1>,
    task2: () => Promise<T2>
  ): Promise<ParallelFetchResult<T1, T2>> {
    const overallStartTime = Date.now();

    // 並列実行(各タスクにタイムアウト制御を適用)
    const [result1, result2] = await Promise.all([
      this.executeWithTimeout(task1, this.task1TimeoutMs),
      this.executeWithTimeout(task2, this.task2TimeoutMs),
    ]);

    const totalDurationMs = Date.now() - overallStartTime;

    // 成功判定
    const task1Success = result1.result !== undefined && !result1.timedOut && !result1.error;
    const task2Success = result2.result !== undefined && !result2.timedOut && !result2.error;
    const success = task1Success && task2Success;
    const partialSuccess = (task1Success || task2Success) && !success;

    return {
      success,
      partialSuccess,
      result1: result1.result,
      result2: result2.result,
      task1TimedOut: result1.timedOut,
      task2TimedOut: result2.timedOut,
      error1: result1.error,
      error2: result2.error,
      timing: {
        task1DurationMs: result1.durationMs,
        task2DurationMs: result2.durationMs,
        totalDurationMs,
      },
    };
  }

  /**
   * タイムアウト付きでタスクを実行
   *
   * タスクが指定時間内に完了しない場合、タイムアウトとして扱います。
   *
   * @template T - タスクの結果型
   * @param task - 実行するタスク関数
   * @param timeoutMs - タイムアウト時間(ミリ秒)
   * @returns タイムアウト付き実行結果
   */
  private async executeWithTimeout<T>(
    task: () => Promise<T>,
    timeoutMs: number
  ): Promise<TimeoutResult<T>> {
    const startTime = Date.now();

    // タイムアウトPromiseを作成
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      // タスクとタイムアウトを競争させる
      const result = await Promise.race([task(), timeoutPromise]);
      const durationMs = Date.now() - startTime;

      return {
        result,
        timedOut: false,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const isTimeout = error instanceof Error && error.message.includes('timed out');

      return {
        error: error instanceof Error ? error : new Error(String(error)),
        timedOut: isTimeout,
        durationMs,
      };
    }
  }
}
