/**
 * バッチメタデータモデル
 * Task 2.3: キャッシュ管理システム実装(案B: メタデータによる軽量チェック)
 *
 * バッチ処理の最終更新時刻を管理し、クライアント側でキャッシュの有効性を判断するために使用します。
 * Firestoreパス: metadata/batch
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * バッチメタデータのFirestoreドキュメント構造
 */
export interface BatchMetadataDocument {
  /** ニュースバッチの最終更新時刻 */
  newsLastUpdated: Timestamp;
  /** 用語バッチの最終更新時刻 */
  termsLastUpdated: Timestamp;
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
 * Firestoreのメタデータコレクション名
 */
export const METADATA_COLLECTION = 'metadata';

/**
 * バッチメタデータのドキュメントID
 */
export const BATCH_METADATA_DOC_ID = 'batch';

/**
 * BatchMetadataDocumentからBatchMetadataへ変換する
 * @param doc - Firestoreのドキュメントデータ
 * @returns クライアント向けのBatchMetadata
 */
export function toBatchMetadata(doc: BatchMetadataDocument): BatchMetadata {
  return {
    newsLastUpdated: doc.newsLastUpdated.toMillis(),
    termsLastUpdated: doc.termsLastUpdated.toMillis(),
  };
}
