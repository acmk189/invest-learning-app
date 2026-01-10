/**
 * Data Models Index
 *
 * すべてのデータモデルをエクスポートします。
 */

// Firebase用モデル(移行後は削除予定)
export * from './news.model';
export * from './terms.model';
export * from './metadata.model';

// Supabase用型定義
export * from './supabase.types';

// Supabase用モデル変換関数(Task 4: データモデル移行)
export * from './model-converters';
