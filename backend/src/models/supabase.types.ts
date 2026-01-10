/**
 * Supabase PostgreSQL用の型定義
 *
 * Task 3.1: Supabase SDK型定義
 * Requirements: 3, 4
 *
 * データベーステーブルの行型とバリデーション関数を定義します。
 * これらの型はdesign.mdで定義されたスキーマに対応しています。
 */

/**
 * 難易度レベルの型
 *
 * 用語の難易度を表す列挙型相当の文字列リテラル型
 */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * news テーブルの行型
 *
 * @property date - 日付（YYYY-MM-DD形式、PRIMARY KEY）
 * @property world_news_title - 世界ニュースのタイトル
 * @property world_news_summary - 世界ニュースの要約（約2000文字）
 * @property japan_news_title - 日本ニュースのタイトル
 * @property japan_news_summary - 日本ニュースの要約（約2000文字）
 * @property created_at - 作成日時（ISO 8601形式）
 * @property updated_at - 更新日時（ISO 8601形式）
 */
export interface NewsRow {
  date: string;
  world_news_title: string;
  world_news_summary: string;
  japan_news_title: string;
  japan_news_summary: string;
  created_at: string;
  updated_at: string;
}

/**
 * news テーブルへのupsert用ペイロード型
 *
 * created_atは自動設定されるためオプション
 */
export interface NewsUpsertPayload {
  date: string;
  world_news_title: string;
  world_news_summary: string;
  japan_news_title: string;
  japan_news_summary: string;
  updated_at: string;
}

/**
 * terms テーブルの行型
 *
 * @property id - 自動生成されるID（SERIAL PRIMARY KEY）
 * @property date - 日付（YYYY-MM-DD形式）
 * @property name - 用語名
 * @property description - 用語の説明（約500文字）
 * @property difficulty - 難易度（beginner, intermediate, advanced）
 * @property created_at - 作成日時（ISO 8601形式）
 */
export interface TermRow {
  id: number;
  date: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  created_at: string;
}

/**
 * terms テーブルへのinsert用ペイロード型
 *
 * idとcreated_atは自動設定されるためオプション
 */
export interface TermInsertPayload {
  date: string;
  name: string;
  description: string;
  difficulty: Difficulty;
}

/**
 * terms_history テーブルの行型
 *
 * @property id - 自動生成されるID（SERIAL PRIMARY KEY）
 * @property term_name - 用語名
 * @property delivered_at - 配信日時（ISO 8601形式）
 * @property difficulty - 難易度
 */
export interface TermHistoryRow {
  id: number;
  term_name: string;
  delivered_at: string;
  difficulty: Difficulty;
}

/**
 * terms_history テーブルへのinsert用ペイロード型
 *
 * idは自動設定されるためオプション
 */
export interface TermHistoryInsertPayload {
  term_name: string;
  delivered_at: string;
  difficulty: Difficulty;
}

/**
 * batch_metadata テーブルの行型
 *
 * @property id - ID（常に1、シングルトンレコード）
 * @property news_last_updated - ニュースの最終更新日時（ISO 8601形式、null許容）
 * @property terms_last_updated - 用語の最終更新日時（ISO 8601形式、null許容）
 */
export interface BatchMetadataRow {
  id: number;
  news_last_updated: string | null;
  terms_last_updated: string | null;
}

/**
 * batch_metadata テーブルへのupdate用ペイロード型
 */
export interface BatchMetadataUpdatePayload {
  news_last_updated?: string;
  terms_last_updated?: string;
}

/**
 * 難易度の有効値配列
 */
export const VALID_DIFFICULTIES: readonly Difficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
] as const;

/**
 * 難易度が有効かどうかを検証する
 *
 * @param value - 検証する値
 * @returns 有効な難易度の場合true
 */
export function isValidDifficulty(value: unknown): value is Difficulty {
  return (
    typeof value === 'string' &&
    VALID_DIFFICULTIES.includes(value as Difficulty)
  );
}

/**
 * 日付文字列がYYYY-MM-DD形式かどうかを検証する
 *
 * @param value - 検証する値
 * @returns 有効な日付形式の場合true
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return false;
  }
  // 実際の日付として有効か検証
  // JavaScriptのDateは無効な日付を自動補正するため、パース後の値と元の値を比較
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * ISO 8601形式の日時文字列かどうかを検証する
 *
 * @param value - 検証する値
 * @returns 有効なISO 8601形式の場合true
 */
export function isValidISODateString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('T');
}
