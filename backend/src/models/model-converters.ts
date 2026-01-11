/**
 * モデル変換関数
 *
 * Task 4: バックエンドデータモデル移行
 * Requirements: 4
 *
 * 内部モデル(Date型)からSupabase用型(ISO 8601文字列)への
 * 変換関数を提供します。既存のバリデーションロジック(文字数制限等)を維持しつつ、
 * Supabase PostgreSQLに適したデータ構造へ変換します。
 *
 * ## 関数の用途分類
 *
 * ### 継続利用(Supabase運用で必要)
 * - `batchMetadataRowToClientFormat()` - メタデータのクライアント形式変換
 * - `createBatchMetadataUpdatePayload()` - バッチ処理でのメタデータ更新
 * - `validateNewsRow()` - ニュースデータのバリデーション
 * - `validateTermInsertPayload()` - 用語データのバリデーション
 * - `validateTermInsertPayloads()` - 用語配列のバリデーション
 *
 * ### 内部変換用(アプリ内のデータ変換)
 * - `newsDocumentToNewsRow()` - NewsDocument → Supabase NewsRow
 * - `newsDocumentToUpsertPayload()` - NewsDocument → upsertペイロード
 * - `termsDocumentToTermRows()` - TermsDocument → Supabase TermInsertPayload[]
 * - `termToTermInsertPayload()` - Term → TermInsertPayload
 * - `termHistoryDocumentToPayload()` - TermHistoryDocument → Supabase用
 */

import type { NewsDocument } from './news.model';
import type { TermsDocument, TermHistoryDocument, Term } from './terms.model';
import type {
  NewsRow,
  TermInsertPayload,
  TermHistoryInsertPayload,
  Difficulty,
  NewsUpsertPayload,
  BatchMetadataRow,
  BatchMetadataUpdatePayload,
} from './supabase.types';
import { VALID_DIFFICULTIES } from './supabase.types';
import type { BatchMetadata } from './metadata.model';

/**
 * NewsDocumentをNewsRow(Supabase用)に変換する
 *
 * Date型の日時をISO 8601文字列に変換し、フラットな構造に変換します。
 *
 * @param doc - NewsDocument(内部モデル)
 * @returns Supabase news テーブル用のNewsRow
 */
export function newsDocumentToNewsRow(doc: NewsDocument): NewsRow {
  return {
    date: doc.date,
    world_news_title: doc.worldNews.title,
    world_news_summary: doc.worldNews.summary,
    japan_news_title: doc.japanNews.title,
    japan_news_summary: doc.japanNews.summary,
    created_at: doc.createdAt.toISOString(),
    updated_at: doc.updatedAt.toISOString(),
  };
}

/**
 * NewsDocumentからupsert用ペイロードを生成する
 *
 * @param doc - NewsDocument(内部モデル)
 * @returns Supabase news テーブルへのupsert用ペイロード
 */
export function newsDocumentToUpsertPayload(doc: NewsDocument): NewsUpsertPayload {
  return {
    date: doc.date,
    world_news_title: doc.worldNews.title,
    world_news_summary: doc.worldNews.summary,
    japan_news_title: doc.japanNews.title,
    japan_news_summary: doc.japanNews.summary,
    updated_at: doc.updatedAt.toISOString(),
  };
}

/**
 * TermsDocumentをTermInsertPayload配列に変換する
 *
 * Firestoreの配列構造からPostgreSQLの個別行に展開します。
 * 各用語に同じ日付を設定します。
 *
 * @param doc - TermsDocument(内部モデル)
 * @returns Supabase terms テーブル用のTermInsertPayload配列
 */
export function termsDocumentToTermRows(doc: TermsDocument): TermInsertPayload[] {
  return doc.terms.map((term) => termToTermInsertPayload(term, doc.date));
}

/**
 * 単一のTermをTermInsertPayloadに変換する
 *
 * @param term - 用語
 * @param date - 日付(YYYY-MM-DD形式)
 * @returns Supabase terms テーブル用のTermInsertPayload
 */
export function termToTermInsertPayload(term: Term, date: string): TermInsertPayload {
  return {
    date,
    name: term.name,
    description: term.description,
    difficulty: term.difficulty,
  };
}

/**
 * TermHistoryDocumentをTermHistoryInsertPayloadに変換する
 *
 * Date型の配信日時をISO 8601文字列に変換します。
 *
 * @param doc - TermHistoryDocument(内部モデル)
 * @returns Supabase terms_history テーブル用のTermHistoryInsertPayload
 */
export function termHistoryDocumentToPayload(
  doc: TermHistoryDocument
): TermHistoryInsertPayload {
  return {
    term_name: doc.termName,
    delivered_at: doc.deliveredAt.toISOString(),
    difficulty: doc.difficulty,
  };
}

/**
 * NewsRowを検証する
 *
 * 既存のバリデーションロジック(文字数制限等)を維持しつつ、
 * Supabase用の型で検証します。
 *
 * @param row - 検証対象のNewsRow
 * @throws {Error} 検証失敗時
 *
 * 検証項目:
 * - 日付がYYYY-MM-DD形式であること
 * - 要約文が1800〜2200文字の範囲内であること(Requirement 1.4)
 */
export function validateNewsRow(row: NewsRow): void {
  // 日付フォーマット検証
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(row.date)) {
    throw new Error('日付はYYYY-MM-DD形式である必要があります');
  }

  // 世界ニュース要約文の文字数検証
  const worldSummaryLength = row.world_news_summary.length;
  if (worldSummaryLength < 1800 || worldSummaryLength > 2200) {
    throw new Error(
      `世界ニュースの要約文は1800〜2200文字である必要があります(現在: ${worldSummaryLength}文字)`
    );
  }

  // 日本ニュース要約文の文字数検証
  const japanSummaryLength = row.japan_news_summary.length;
  if (japanSummaryLength < 1800 || japanSummaryLength > 2200) {
    throw new Error(
      `日本ニュースの要約文は1800〜2200文字である必要があります(現在: ${japanSummaryLength}文字)`
    );
  }
}

/**
 * TermInsertPayloadを検証する
 *
 * 既存のバリデーションロジック(文字数制限等)を維持しつつ、
 * Supabase用の型で検証します。
 *
 * @param payload - 検証対象のTermInsertPayload
 * @throws {Error} 検証失敗時
 *
 * 検証項目:
 * - 日付がYYYY-MM-DD形式であること
 * - 用語名が空でないこと
 * - 解説文が400〜600文字の範囲内であること(Requirement 4.2)
 * - 難易度が有効な値であること
 */
export function validateTermInsertPayload(payload: TermInsertPayload): void {
  // 日付フォーマット検証
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(payload.date)) {
    throw new Error('日付はYYYY-MM-DD形式である必要があります');
  }

  // 用語名検証
  if (!payload.name || payload.name.trim() === '') {
    throw new Error('用語名は必須です');
  }

  // 解説文の文字数検証
  const descriptionLength = payload.description.length;
  if (descriptionLength < 400 || descriptionLength > 600) {
    throw new Error(
      `解説文は400〜600文字である必要があります(現在: ${descriptionLength}文字)`
    );
  }

  // 難易度検証
  if (!VALID_DIFFICULTIES.includes(payload.difficulty as Difficulty)) {
    throw new Error(
      `難易度はbeginner, intermediate, advancedのいずれかである必要があります(現在: ${payload.difficulty})`
    );
  }
}

/**
 * TermInsertPayload配列(3つの用語)を検証する
 *
 * @param payloads - 検証対象のTermInsertPayload配列
 * @throws {Error} 検証失敗時
 */
export function validateTermInsertPayloads(payloads: TermInsertPayload[]): void {
  // 用語数検証
  if (payloads.length !== 3) {
    throw new Error(`用語は必ず3つである必要があります(現在: ${payloads.length}個)`);
  }

  // 各用語を検証
  payloads.forEach((payload, index) => {
    try {
      validateTermInsertPayload(payload);
    } catch (error) {
      throw new Error(
        `用語${index + 1}の検証に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}

/**
 * BatchMetadataRowをクライアント向けフォーマットに変換する
 *
 * Supabaseから取得したbatch_metadataテーブルの行を、
 * フロントエンドで使用するBatchMetadata形式に変換します。
 * ISO 8601文字列をUnixタイムスタンプ(ミリ秒)に変換します。
 *
 * @param row - Supabase batch_metadataテーブルの行
 * @returns クライアント向けBatchMetadata(Unixタイムスタンプ形式)
 */
export function batchMetadataRowToClientFormat(row: BatchMetadataRow): BatchMetadata {
  return {
    newsLastUpdated: row.news_last_updated
      ? new Date(row.news_last_updated).getTime()
      : 0,
    termsLastUpdated: row.terms_last_updated
      ? new Date(row.terms_last_updated).getTime()
      : 0,
  };
}

/**
 * バッチメタデータ更新用ペイロードを生成する
 *
 * バッチ処理完了時にbatch_metadataテーブルを更新するためのペイロードを生成します。
 * 指定された種別(news/terms)の最終更新日時のみを設定します。
 *
 * @param type - 更新対象('news' または 'terms')
 * @param timestamp - 更新日時(Date型)
 * @returns Supabase batch_metadataテーブル更新用ペイロード
 */
export function createBatchMetadataUpdatePayload(
  type: 'news' | 'terms',
  timestamp: Date
): BatchMetadataUpdatePayload {
  if (type === 'news') {
    return { news_last_updated: timestamp.toISOString() };
  }
  return { terms_last_updated: timestamp.toISOString() };
}
