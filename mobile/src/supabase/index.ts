/**
 * Supabase モジュール エクスポート
 * Task 8, 9: フロントエンドSupabaseクライアント・クエリ実装
 *
 * このファイルはモバイルアプリ用のSupabaseモジュールを集約します。
 *
 * Requirements:
 * - 7: フロントエンドSupabaseクライアント実装
 * - 8: フロントエンドクエリ実装
 */

// クライアント関連
export {
  SupabaseClient,
  SupabaseInitParams,
  getDefaultSupabaseClient,
  isSupabaseInitialized,
  initializeSupabaseClient,
  getSupabaseInstance,
  resetSupabaseClient,
} from './client';

// 型定義
export {
  // データ型
  Difficulty,
  NewsItem,
  NewsData,
  NewsRow,
  TermItem,
  TermsData,
  TermRow,
  BatchMetadata,
  BatchMetadataRow,
  SupabaseQueryResult,
  // 設定型
  SupabaseClientConfig,
  DEFAULT_SUPABASE_CLIENT_CONFIG,
  // 定数
  TABLES,
} from './types';

// クエリ関数
export {
  getTodayNews,
  getTodayTerms,
  getBatchMetadata,
  SupabaseQueryError,
} from './queries';
