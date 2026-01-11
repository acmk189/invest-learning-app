/**
 * Supabase クライアント型定義
 * Task 8: フロントエンド - Supabaseクライアント
 *
 * このファイルはモバイルアプリ用のSupabaseデータモデル型を定義します。
 * バックエンドのモデル(backend/src/models/supabase.types.ts)と互換性を持ちます。
 *
 * Requirements:
 * - 7: フロントエンドSupabaseクライアント実装
 * - 8: フロントエンドクエリ実装
 *
 * @see https://supabase.com/docs/reference/javascript/introduction
 */

/**
 * 難易度レベルの型
 *
 * 用語の難易度を表す列挙型相当の文字列リテラル型
 */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * ニュースアイテム(世界・日本共通)
 */
export interface NewsItem {
  /** ニュースタイトル */
  title: string;
  /** 要約本文(約2000文字) */
  summary: string;
  /** 更新日時(ISO 8601文字列) */
  updatedAt: string;
}

/**
 * ニュースデータ
 * Supabaseテーブル: news
 */
export interface NewsData {
  /** 日付(YYYY-MM-DD形式) */
  date: string;
  /** 世界のニュース */
  worldNews: NewsItem;
  /** 日本のニュース */
  japanNews: NewsItem;
  /** 作成日時(ISO 8601文字列) */
  createdAt: string;
  /** 更新日時(ISO 8601文字列) */
  updatedAt: string;
}

/**
 * news テーブルの行型(Supabase PostgreSQL)
 *
 * @property date - 日付(YYYY-MM-DD形式、PRIMARY KEY)
 * @property world_news_title - 世界ニュースのタイトル
 * @property world_news_summary - 世界ニュースの要約(約2000文字)
 * @property japan_news_title - 日本ニュースのタイトル
 * @property japan_news_summary - 日本ニュースの要約(約2000文字)
 * @property created_at - 作成日時(ISO 8601形式)
 * @property updated_at - 更新日時(ISO 8601形式)
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
 * 用語アイテム
 */
export interface TermItem {
  /** 用語名 */
  name: string;
  /** 解説文(約500文字) */
  description: string;
  /** 難易度 */
  difficulty: Difficulty;
}

/**
 * 用語データ(アプリ表示用)
 */
export interface TermsData {
  /** 日付(YYYY-MM-DD形式) */
  date: string;
  /** 3つの用語 */
  terms: TermItem[];
  /** 作成日時(ISO 8601文字列) */
  createdAt: string;
  /** 更新日時(ISO 8601文字列) */
  updatedAt: string;
}

/**
 * terms テーブルの行型(Supabase PostgreSQL)
 *
 * @property id - 自動生成されるID(SERIAL PRIMARY KEY)
 * @property date - 日付(YYYY-MM-DD形式)
 * @property name - 用語名
 * @property description - 用語の説明(約500文字)
 * @property difficulty - 難易度(beginner, intermediate, advanced)
 * @property created_at - 作成日時(ISO 8601形式)
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
 * batch_metadata テーブルの行型
 *
 * キャッシュ有効性チェックに使用
 *
 * @property id - ID(常に1、シングルトンレコード)
 * @property news_last_updated - ニュースの最終更新日時(ISO 8601形式、null許容)
 * @property terms_last_updated - 用語の最終更新日時(ISO 8601形式、null許容)
 */
export interface BatchMetadataRow {
  id: number;
  news_last_updated: string | null;
  terms_last_updated: string | null;
}

/**
 * バッチメタデータ(アプリ表示用)
 * キャッシュ有効性チェックに使用
 */
export interface BatchMetadata {
  /** ニュースバッチの最終更新時刻(Unixタイムスタンプ、ミリ秒) */
  newsLastUpdated: number;
  /** 用語バッチの最終更新時刻(Unixタイムスタンプ、ミリ秒) */
  termsLastUpdated: number;
}

/**
 * Supabaseクエリ結果
 */
export interface SupabaseQueryResult<T> {
  /** 取得したデータ(見つからない場合はnull) */
  data: T | null;
  /** データが見つかったかどうか */
  exists: boolean;
}

/**
 * Supabase接続設定
 */
export interface SupabaseClientConfig {
  /** Supabase URL */
  url: string;
  /** Supabase anon key(クライアントサイド認証用) */
  anonKey: string;
  /** 接続タイムアウト(ミリ秒、デフォルト: 10000) */
  connectionTimeout: number;
}

/**
 * デフォルトのSupabaseクライアント設定
 */
export const DEFAULT_SUPABASE_CLIENT_CONFIG: Omit<SupabaseClientConfig, 'url' | 'anonKey'> = {
  connectionTimeout: 10000, // 10秒
};

/**
 * Supabaseテーブル名の定数定義
 */
export const TABLES = {
  /** ニューステーブル */
  NEWS: 'news',
  /** 投資用語テーブル */
  TERMS: 'terms',
  /** 用語履歴テーブル */
  TERMS_HISTORY: 'terms_history',
  /** バッチメタデータテーブル */
  BATCH_METADATA: 'batch_metadata',
} as const;
