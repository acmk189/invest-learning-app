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

// =====================================================
// データ変換関数 (Repository層用)
// =====================================================

import {
  NewsData,
  TermsData,
  BatchMetadata,
  SupabaseQueryResult,
} from './types';

/**
 * JSTタイムゾーンオフセット (ミリ秒)
 * UTC+9
 */
const JST_OFFSET = 9 * 60 * 60 * 1000;

/**
 * 日付をJSTのYYYY-MM-DD形式に変換する
 *
 * @param date - 変換する日付
 * @returns YYYY-MM-DD形式の文字列
 */
export function formatDateToJST(date: Date): string {
  const jstDate = new Date(date.getTime() + JST_OFFSET);
  return jstDate.toISOString().split('T')[0];
}

/**
 * NewsRowをNewsDataに変換する
 *
 * Supabaseのテーブル構造からアプリ表示用のデータ構造に変換
 *
 * @param row - Supabaseから取得したNewsRow
 * @returns アプリ表示用のNewsData
 */
export function newsRowToNewsData(row: NewsRow): NewsData {
  return {
    date: row.date,
    worldNews: {
      title: row.world_news_title,
      summary: row.world_news_summary,
      updatedAt: row.updated_at,
    },
    japanNews: {
      title: row.japan_news_title,
      summary: row.japan_news_summary,
      updatedAt: row.updated_at,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * TermRow[]をTermsDataに変換する
 *
 * Supabaseの行データ(複数)からアプリ表示用のデータ構造に変換
 *
 * @param rows - Supabaseから取得したTermRow配列
 * @param date - 日付(YYYY-MM-DD形式)
 * @returns アプリ表示用のTermsData
 */
export function termRowsToTermsData(rows: TermRow[], date: string): TermsData {
  // 最新のcreated_atを取得 (バッチ登録時刻)
  const latestCreatedAt = rows.length > 0 ? rows[rows.length - 1].created_at : new Date().toISOString();

  return {
    date,
    terms: rows.map((row) => ({
      name: row.name,
      description: row.description,
      difficulty: row.difficulty,
    })),
    createdAt: latestCreatedAt,
    updatedAt: latestCreatedAt,
  };
}

/**
 * BatchMetadataRowをBatchMetadataに変換する
 *
 * ISO 8601文字列をUnixタイムスタンプ(ミリ秒)に変換
 *
 * @param row - Supabaseから取得したBatchMetadataRow
 * @returns キャッシュチェック用のBatchMetadata
 */
export function batchMetadataRowToBatchMetadata(row: BatchMetadataRow): BatchMetadata {
  return {
    newsLastUpdated: row.news_last_updated ? new Date(row.news_last_updated).getTime() : 0,
    termsLastUpdated: row.terms_last_updated ? new Date(row.terms_last_updated).getTime() : 0,
  };
}

/**
 * 今日のニュースを取得する (Repository層用)
 *
 * @returns SupabaseQueryResult<NewsData>
 * @throws {SupabaseQueryError} Supabaseエラー発生時
 */
export async function fetchTodayNewsForRepository(): Promise<SupabaseQueryResult<NewsData>> {
  const today = formatDateToJST(new Date());

  const newsRow = await getTodayNews(today);

  if (!newsRow) {
    return { data: null, exists: false };
  }

  return { data: newsRowToNewsData(newsRow), exists: true };
}

/**
 * 今日の用語を取得する (Repository層用)
 *
 * @returns SupabaseQueryResult<TermsData>
 * @throws {SupabaseQueryError} Supabaseエラー発生時
 */
export async function fetchTodayTermsForRepository(): Promise<SupabaseQueryResult<TermsData>> {
  const today = formatDateToJST(new Date());

  const termRows = await getTodayTerms(today);

  if (termRows.length === 0) {
    return { data: null, exists: false };
  }

  return { data: termRowsToTermsData(termRows, today), exists: true };
}

/**
 * バッチメタデータを取得する (キャッシュ用)
 *
 * オフライン時やエラー時はnullを返す (キャッシュフォールバック用)
 *
 * @returns BatchMetadata or null
 */
export async function fetchBatchMetadataForCache(): Promise<BatchMetadata | null> {
  try {
    const row = await getBatchMetadata();

    if (!row) {
      return null;
    }

    return batchMetadataRowToBatchMetadata(row);
  } catch (error) {
    // メタデータ取得失敗時はログを出力してnullを返す
    // これによりオフライン時にキャッシュを使用できる
    console.warn('[Supabase] Failed to fetch batch metadata:', error);
    return null;
  }
}
