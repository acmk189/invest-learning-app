/**
 * Supabase クエリ関数
 * Task 9: フロントエンドクエリ実装
 *
 * Supabaseからデータを取得するためのクエリ関数を提供します。
 * 各関数は型安全なクエリ結果を返します。
 *
 * Requirements:
 * - 8: フロントエンドクエリ実装
 * - 8.1: 今日のニュース取得クエリ
 * - 8.2: 今日の用語取得クエリ
 * - 8.3: バッチメタデータ取得クエリ
 * - 8.5: エラーハンドリング
 *
 * @see https://supabase.com/docs/reference/javascript/select
 */

import { getSupabaseInstance } from './client';
import { NewsRow, TermRow, BatchMetadataRow, TABLES } from './types';

/**
 * 日付フォーマットの検証
 *
 * YYYY-MM-DD形式かどうかを検証します。
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Supabaseクエリエラー
 *
 * Supabaseからのエラーレスポンスをラップするカスタムエラークラス。
 * エラーコード、詳細情報、ヒントを保持します。
 *
 * @see https://supabase.com/docs/reference/javascript/handling-errors
 */
export class SupabaseQueryError extends Error {
  /** Supabaseエラーコード (例: PGRST116, 42P01) */
  readonly code: string;
  /** エラーの詳細情報 */
  readonly details: string | null;
  /** 解決のヒント */
  readonly hint: string | null;

  constructor(
    code: string,
    message: string,
    details: string | null,
    hint: string | null
  ) {
    super(message);
    this.name = 'SupabaseQueryError';
    this.code = code;
    this.details = details;
    this.hint = hint;

    // Errorのプロトタイプチェーンを正しく設定
    Object.setPrototypeOf(this, SupabaseQueryError.prototype);
  }
}

/**
 * 日付形式を検証する
 *
 * @param date - 検証する日付文字列
 * @throws {Error} 無効な日付形式の場合
 */
function validateDateFormat(date: string): void {
  if (!date || !DATE_REGEX.test(date)) {
    throw new Error(
      `Invalid date format: "${date}". Expected YYYY-MM-DD format.`
    );
  }
}

/**
 * Supabaseエラーをスローする
 *
 * @param error - Supabaseエラーオブジェクト
 * @throws {SupabaseQueryError} 常にスロー
 */
function throwSupabaseError(error: {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}): never {
  throw new SupabaseQueryError(
    error.code ?? 'UNKNOWN',
    error.message,
    error.details ?? null,
    error.hint ?? null
  );
}

/**
 * 今日のニュースを取得する
 *
 * 指定された日付のニュースをSupabaseから取得します。
 * newsテーブルから日付をキーにして1件取得します。
 *
 * @param date - 取得する日付 (YYYY-MM-DD形式)
 * @returns NewsRow or null (見つからない場合)
 * @throws {Error} 無効な日付形式の場合
 * @throws {SupabaseQueryError} Supabaseエラー発生時
 *
 * @example
 * ```typescript
 * const news = await getTodayNews('2026-01-11');
 * if (news) {
 *   console.log(news.world_news_title);
 *   console.log(news.japan_news_summary);
 * }
 * ```
 */
export async function getTodayNews(date: string): Promise<NewsRow | null> {
  // 日付形式を検証
  validateDateFormat(date);

  const supabase = getSupabaseInstance();

  // newsテーブルから日付でフィルタして1件取得
  // date列はPRIMARY KEYなので必ず0または1件
  // @see https://supabase.com/docs/reference/javascript/single
  const { data, error } = await supabase
    .from(TABLES.NEWS)
    .select('*')
    .eq('date', date)
    .single();

  // エラーがある場合はスロー
  if (error) {
    throwSupabaseError(error);
  }

  // データがない場合はnullを返す
  return data as NewsRow | null;
}

/**
 * 今日の用語を取得する
 *
 * 指定された日付の用語をSupabaseから取得します。
 * termsテーブルから日付でフィルタして3件取得します。
 * 作成日時順(古い順)でソートされます。
 *
 * @param date - 取得する日付 (YYYY-MM-DD形式)
 * @returns TermRow[] (見つからない場合は空配列)
 * @throws {Error} 無効な日付形式の場合
 * @throws {SupabaseQueryError} Supabaseエラー発生時
 *
 * @example
 * ```typescript
 * const terms = await getTodayTerms('2026-01-11');
 * terms.forEach(term => {
 *   console.log(`${term.name}: ${term.description}`);
 * });
 * ```
 */
export async function getTodayTerms(date: string): Promise<TermRow[]> {
  // 日付形式を検証
  validateDateFormat(date);

  const supabase = getSupabaseInstance();

  // termsテーブルから日付でフィルタして取得
  // created_at昇順でソート(バッチ処理で登録された順)
  // @see https://supabase.com/docs/reference/javascript/order
  const { data, error } = await supabase
    .from(TABLES.TERMS)
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true });

  // エラーがある場合はスロー
  if (error) {
    throwSupabaseError(error);
  }

  // データがnullの場合は空配列を返す
  return (data as TermRow[]) ?? [];
}

/**
 * バッチメタデータを取得する
 *
 * バッチ処理の最終更新日時を取得します。
 * キャッシュの有効性チェックに使用します。
 * batch_metadataテーブルはシングルトン(id=1の1行のみ)です。
 *
 * @returns BatchMetadataRow or null (見つからない場合)
 * @throws {SupabaseQueryError} Supabaseエラー発生時
 *
 * @example
 * ```typescript
 * const metadata = await getBatchMetadata();
 * if (metadata?.news_last_updated) {
 *   const lastUpdate = new Date(metadata.news_last_updated);
 *   console.log(`最終更新: ${lastUpdate.toLocaleString()}`);
 * }
 * ```
 */
export async function getBatchMetadata(): Promise<BatchMetadataRow | null> {
  const supabase = getSupabaseInstance();

  // batch_metadataテーブルからid=1のレコードを取得
  // このテーブルは常に1行のみ存在する設計
  // @see design.md - batch_metadata テーブル
  const { data, error } = await supabase
    .from(TABLES.BATCH_METADATA)
    .select('*')
    .eq('id', 1)
    .single();

  // エラーがある場合はスロー
  if (error) {
    throwSupabaseError(error);
  }

  return data as BatchMetadataRow | null;
}
