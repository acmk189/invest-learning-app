/**
 * キャッシュ管理システム 型定義
 * Task 2.3: キャッシュ管理システム実装
 */

/**
 * キャッシュの種類
 */
export type CacheType = 'news' | 'terms';

/**
 * キャッシュキーのプレフィックス
 */
export const CACHE_KEY_PREFIX = 'cache_';

/**
 * キャッシュキーの型
 */
export type CacheKey = `${typeof CACHE_KEY_PREFIX}${CacheType}_${string}`;

/**
 * ニュースアイテムの型
 */
export interface NewsItem {
  title: string;
  summary: string;
  updatedAt: string;
}

/**
 * ニュースデータの型
 */
export interface NewsData {
  worldNews: NewsItem;
  japanNews: NewsItem;
}

/**
 * 投資用語アイテムの型
 */
export interface TermItem {
  name: string;
  description: string;
}

/**
 * 投資用語データの型
 */
export interface TermsData {
  terms: TermItem[];
  deliveredAt: string;
}

/**
 * キャッシュエントリの型
 * キャッシュデータとメタデータを含む
 */
export interface CacheEntry<T> {
  /** キャッシュされたデータ */
  data: T;
  /** キャッシュされた日時（タイムスタンプ） */
  cachedAt: number;
  /** キャッシュの有効期限（タイムスタンプ） */
  expiresAt: number;
}

/**
 * キャッシュ取得結果の型
 */
export type CacheResult<T> = T | null;

/**
 * キャッシュ操作のエラー型
 */
export interface CacheError {
  code: 'CACHE_READ_ERROR' | 'CACHE_WRITE_ERROR' | 'CACHE_PARSE_ERROR' | 'CACHE_CLEAR_ERROR';
  message: string;
  originalError?: Error;
}
