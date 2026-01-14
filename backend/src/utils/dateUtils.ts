/**
 * 日付ユーティリティ
 *
 * JST(日本標準時)での日付処理を提供します。
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
 */

/**
 * JSTタイムゾーンオフセット(ミリ秒)
 * UTC+9
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 日付をJSTのYYYY-MM-DD形式に変換する
 *
 * Vercel Serverless Functions(UTC環境)で実行される際に、
 * JSTでの日付を取得するために使用します。
 *
 * @param date - 変換する日付(省略時は現在時刻)
 * @returns YYYY-MM-DD形式の日付文字列(JST)
 *
 * @example
 * // UTC 2026-01-13 23:00:00 -> JST 2026-01-14 08:00:00
 * formatDateToJST(new Date('2026-01-13T23:00:00Z')); // '2026-01-14'
 *
 * @example
 * // 現在時刻をJSTで取得
 * const today = formatDateToJST(); // '2026-01-14'
 */
export function formatDateToJST(date: Date = new Date()): string {
  const jstDate = new Date(date.getTime() + JST_OFFSET_MS);
  return jstDate.toISOString().split('T')[0];
}

/**
 * 現在のJST日時をISO 8601形式で取得する
 *
 * @returns ISO 8601形式の日時文字列(JST基準だがUTC表記)
 *
 * @example
 * getJSTTimestamp(); // '2026-01-14T08:00:00.000Z'
 */
export function getJSTTimestamp(): string {
  return new Date().toISOString();
}
