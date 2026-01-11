/**
 * バッチメタデータモデル
 * Task 2.3: キャッシュ管理システム実装(案B: メタデータによる軽量チェック)
 * Task 12: Firebase依存の完全削除 - Supabase対応
 *
 * バッチ処理の最終更新時刻を管理し、クライアント側でキャッシュの有効性を判断するために使用します。
 * Supabaseテーブル: batch_metadata
 */

/**
 * バッチメタデータのSupabaseテーブル構造
 */
export interface BatchMetadataRecord {
  /** 一意のID */
  id: number;
  /** ニュースバッチの最終更新時刻(ISO 8601文字列) */
  news_last_updated: string;
  /** 用語バッチの最終更新時刻(ISO 8601文字列) */
  terms_last_updated: string;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/**
 * バッチメタデータのクライアント向け構造(タイムスタンプをnumberに変換)
 */
export interface BatchMetadata {
  /** ニュースバッチの最終更新時刻(Unixタイムスタンプ、ミリ秒) */
  newsLastUpdated: number;
  /** 用語バッチの最終更新時刻(Unixタイムスタンプ、ミリ秒) */
  termsLastUpdated: number;
}

/**
 * Supabaseのメタデータテーブル名
 */
export const METADATA_TABLE = 'batch_metadata';

/**
 * バッチメタデータのレコードID(固定値)
 */
export const BATCH_METADATA_ID = 1;

/**
 * BatchMetadataRecordからBatchMetadataへ変換する
 * @param record - Supabaseのテーブルレコード
 * @returns クライアント向けのBatchMetadata
 */
export function toBatchMetadata(record: BatchMetadataRecord): BatchMetadata {
  return {
    newsLastUpdated: new Date(record.news_last_updated).getTime(),
    termsLastUpdated: new Date(record.terms_last_updated).getTime(),
  };
}
