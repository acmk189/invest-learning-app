/**
 * Cronログ機能
 *
 * Task 13.3: Cronタイムアウト・ログ設定
 *
 * Cron Jobsの実行ログと処理時間計測を行うロガー
 * Vercel Logsで確認可能な構造化ログを出力
 *
 * Requirements:
 * - 1.8 (5分以内にバッチ完了)
 * - 11.3 (エラー発生時詳細ログ)
 *
 * @see https://vercel.com/docs/observability/runtime-logs
 */

/**
 * Cronタイムアウト時間(ミリ秒)
 * Vercel Serverless Functionsの最大実行時間: 5分 = 300秒
 */
export const CRON_TIMEOUT_MS = 300000;

/**
 * タイムアウト警告閾値(ミリ秒)
 * 4分 = 240秒でタイムアウト接近の警告を出力
 */
export const CRON_TIMEOUT_WARNING_MS = 240000;

/**
 * ログレベルの型定義
 */
export type CronLogLevel = 'info' | 'warn' | 'error';

/**
 * ログエントリの型定義
 */
export interface CronLogEntry {
  /** タイムスタンプ */
  timestamp: string;
  /** ログレベル */
  level: CronLogLevel;
  /** ジョブ名 */
  jobName: string;
  /** メッセージ */
  message: string;
  /** 追加データ */
  data?: Record<string, unknown>;
}

/**
 * 処理サマリーの型定義
 */
export interface CronJobSummary {
  /** ジョブ名 */
  jobName: string;
  /** 開始時刻 */
  startTime: string;
  /** 終了時刻 */
  endTime: string;
  /** 処理時間(ミリ秒) */
  durationMs: number;
  /** 処理時間(フォーマット済み) */
  durationFormatted: string;
  /** 成功フラグ */
  success: boolean;
  /** エラーメッセージ(失敗時) */
  error?: string;
  /** ステップ履歴 */
  steps: Array<{
    name: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }>;
}

/**
 * Cronジョブ用のロガークラス
 *
 * 各バッチ処理の開始・終了を記録し、
 * 処理時間とタイムアウトを監視する
 */
export class CronLogger {
  private jobName: string;
  private startTime: number = 0;
  private entries: CronLogEntry[] = [];
  private steps: Array<{
    name: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }> = [];
  private hasWarned = false;

  /**
   * @param jobName - ジョブ名(例: 'news-batch', 'terms-batch')
   */
  constructor(jobName: string) {
    this.jobName = jobName;
  }

  /**
   * 処理開始を記録
   */
  start(): void {
    this.startTime = Date.now();
    this.entries = [];
    this.steps = [];
    this.hasWarned = false;

    const entry: CronLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      jobName: this.jobName,
      message: 'Starting cron job',
    };

    this.entries.push(entry);
    console.log(`[${this.jobName}] Starting at ${entry.timestamp}`);
  }

  /**
   * 処理終了を記録し、サマリーを返す
   *
   * @param error - エラーがあれば設定
   * @returns CronJobSummary
   */
  end(error?: Error): CronJobSummary {
    if (!this.startTime) {
      throw new Error('Logger not started');
    }

    const endTime = Date.now();
    const durationMs = endTime - this.startTime;
    const success = !error;

    const summary: CronJobSummary = {
      jobName: this.jobName,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMs,
      durationFormatted: formatDuration(durationMs),
      success,
      error: error?.message,
      steps: this.steps,
    };

    if (success) {
      console.log(
        `[${this.jobName}] Completed successfully in ${summary.durationFormatted}`
      );
    } else {
      console.error(
        `[${this.jobName}] Failed after ${summary.durationFormatted}: ${error?.message}`
      );
    }

    return summary;
  }

  /**
   * ログを出力
   *
   * @param level - ログレベル
   * @param message - メッセージ
   * @param data - 追加データ
   */
  log(level: CronLogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: CronLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      jobName: this.jobName,
      message,
      data,
    };

    this.entries.push(entry);

    const logMessage = data
      ? `[${this.jobName}] ${message} ${JSON.stringify(data)}`
      : `[${this.jobName}] ${message}`;

    switch (level) {
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  /**
   * ステップ完了を記録
   *
   * @param stepName - ステップ名
   * @param success - 成功フラグ
   * @param durationMs - 処理時間(ミリ秒)
   * @param error - エラーメッセージ(失敗時)
   */
  logStep(
    stepName: string,
    success: boolean,
    durationMs: number,
    error?: string
  ): void {
    this.steps.push({ name: stepName, success, durationMs, error });

    if (success) {
      console.log(
        `[${this.jobName}] Step '${stepName}' completed in ${durationMs}ms`
      );
    } else {
      console.error(
        `[${this.jobName}] Step '${stepName}' failed after ${durationMs}ms: ${error}`
      );
    }
  }

  /**
   * タイムアウトをチェック
   *
   * @returns タイムアウトした場合true
   */
  checkTimeout(): boolean {
    if (!this.startTime) {
      return false;
    }

    const elapsed = Date.now() - this.startTime;

    // タイムアウト
    if (elapsed >= CRON_TIMEOUT_MS) {
      console.error(
        `[${this.jobName}] TIMEOUT: Job exceeded ${formatDuration(CRON_TIMEOUT_MS)}`
      );
      return true;
    }

    // 警告閾値(一度だけ警告)
    if (elapsed >= CRON_TIMEOUT_WARNING_MS && !this.hasWarned) {
      this.hasWarned = true;
      console.warn(
        `[${this.jobName}] WARNING: Job approaching timeout (${formatDuration(elapsed)} elapsed)`
      );
    }

    return false;
  }

  /**
   * 記録されたエントリーを取得
   */
  getEntries(): CronLogEntry[] {
    return [...this.entries];
  }

  /**
   * 開始時刻を取得
   */
  getStartTime(): number | undefined {
    return this.startTime || undefined;
  }
}

/**
 * ミリ秒を人間が読みやすい形式にフォーマット
 *
 * @param ms - ミリ秒
 * @returns フォーマットされた文字列
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
