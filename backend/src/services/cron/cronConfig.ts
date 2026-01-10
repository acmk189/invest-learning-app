/**
 * Cron設定モジュール
 *
 * Task 13.1: Cron設定とスケジュール定義
 *
 * Vercel Cron Jobsのスケジュール設定とエンドポイント定義
 * 毎日8:00 JST(23:00 UTC)にニュース・用語バッチを実行
 *
 * Requirements:
 * - 12.4 (Vercel Cron Jobs使用)
 * - 1.1 (毎日8:00に実行)
 * - 3.4 (1日1回の更新)
 *
 * @see https://vercel.com/docs/cron-jobs
 * @see https://crontab.guru/ - Cron式リファレンス
 */

/**
 * Cron式の各フィールドの有効範囲
 * minute(0-59) hour(0-23) day(1-31) month(1-12) dayOfWeek(0-7)
 */
const CRON_FIELD_RANGES = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  day: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 7 }, // 0と7は両方日曜日
};

/**
 * Cronスケジュール定義
 *
 * UTC時刻で定義(Vercel Cron JobsはUTCで動作)
 * JST = UTC + 9時間
 *
 * 例: JST 8:00 = UTC 23:00(前日)
 */
export const CRON_SCHEDULE = {
  /**
   * ニュースバッチ: 毎日23:00 UTC(8:00 JST)
   * Cron式: 分 時 日 月 曜日
   */
  NEWS: '0 23 * * *',

  /**
   * 用語バッチ: 毎日23:00 UTC(8:00 JST)
   * ニュースバッチと同時刻に実行
   */
  TERMS: '0 23 * * *',
} as const;

/**
 * Cronエンドポイントの型定義
 */
export interface CronEndpoint {
  /** APIパス(例: /api/batch/news) */
  path: string;
  /** Cronスケジュール(Cron式) */
  schedule: string;
  /** エンドポイントの説明 */
  description?: string;
}

/**
 * Cronエンドポイント一覧
 *
 * vercel.jsonのcrons設定に対応
 */
export const CRON_ENDPOINTS: CronEndpoint[] = [
  {
    path: '/api/batch/news',
    schedule: CRON_SCHEDULE.NEWS,
    description: 'ニュースバッチ処理(世界・日本のニュース取得・要約)',
  },
  {
    path: '/api/batch/terms',
    schedule: CRON_SCHEDULE.TERMS,
    description: '用語バッチ処理(投資用語3つ生成)',
  },
];

/**
 * Cron式が有効かどうかを検証する
 *
 * 5フィールド形式(分 時 日 月 曜日)のCron式を検証
 *
 * @param expression - Cron式
 * @returns 有効な場合true
 */
export function isValidCronExpression(expression: string): boolean {
  if (!expression || typeof expression !== 'string') {
    return false;
  }

  const fields = expression.trim().split(/\s+/);

  // 5フィールドでなければ無効
  if (fields.length !== 5) {
    return false;
  }

  const fieldNames = ['minute', 'hour', 'day', 'month', 'dayOfWeek'] as const;

  // 各フィールドを検証
  for (let i = 0; i < 5; i++) {
    const field = fields[i];
    const range = CRON_FIELD_RANGES[fieldNames[i]];

    if (!isValidCronField(field, range.min, range.max)) {
      return false;
    }
  }

  return true;
}

/**
 * Cron式の単一フィールドを検証
 *
 * @param field - フィールド値
 * @param min - 最小値
 * @param max - 最大値
 * @returns 有効な場合true
 */
function isValidCronField(field: string, min: number, max: number): boolean {
  // ワイルドカード
  if (field === '*') {
    return true;
  }

  // カンマ区切り(リスト)
  if (field.includes(',')) {
    return field.split(',').every((part) => isValidCronField(part, min, max));
  }

  // ハイフン(範囲)
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
  }

  // スラッシュ(間隔)
  if (field.includes('/')) {
    const [base, step] = field.split('/');
    const stepNum = Number(step);
    if (isNaN(stepNum) || stepNum <= 0) {
      return false;
    }
    if (base === '*') {
      return true;
    }
    return isValidCronField(base, min, max);
  }

  // 単一の数値
  const num = Number(field);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * JSTへの変換結果
 */
export interface CronJSTResult {
  /** 時(0-23) */
  hour: number;
  /** 分(0-59) */
  minute: number;
  /** JST時刻文字列(例: "08:00 JST") */
  jstString: string;
}

/**
 * Cron式のUTC時刻をJSTに変換する
 *
 * 毎日実行のCron式(時と分が固定)を対象とする
 *
 * @param expression - Cron式(UTC)
 * @returns JSTへの変換結果
 */
export function parseCronToJST(expression: string): CronJSTResult {
  const fields = expression.trim().split(/\s+/);

  // 分と時を取得
  const minuteUtc = parseInt(fields[0], 10);
  const hourUtc = parseInt(fields[1], 10);

  // JST = UTC + 9時間
  let hourJst = hourUtc + 9;
  if (hourJst >= 24) {
    hourJst -= 24;
  }

  const jstString = `${hourJst.toString().padStart(2, '0')}:${minuteUtc.toString().padStart(2, '0')} JST`;

  return {
    hour: hourJst,
    minute: minuteUtc,
    jstString,
  };
}
