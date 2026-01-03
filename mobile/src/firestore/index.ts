/**
 * Firestore クライアントモジュール
 * Task 14: フロントエンド - Firestoreクライアント
 *
 * このモジュールはモバイルアプリ用のFirestore接続、クエリ、
 * エラーハンドリング機能を提供します。
 *
 * Requirements:
 * - 12.3: Firebase Firestoreを使用する
 * - 2.1: アプリ起動時当日ニュース表示
 * - 2.5: オフライン状態でキャッシュ済みのニュースを表示する
 * - 5.1: 用語タブで3つ表示
 * - 7.5: ネットワークエラー発生時、適切なエラーメッセージを表示
 */

// クライアント
export {
  FirestoreClient,
  getDefaultFirestoreClient,
  isFirestoreInitialized,
  initializeFirestoreClient,
  getFirestoreInstance,
} from './client';

// クエリ
export {
  formatDateToJST,
  fetchTodayNews,
  fetchTodayTerms,
  fetchBatchMetadata,
  fetchNewsByDate,
  fetchTermsByDate,
} from './queries';

// エラーハンドリング
export {
  FirestoreError,
  FirestoreErrorCode,
  ERROR_MESSAGES,
  toFirestoreError,
  getUserFriendlyMessage,
  logFirestoreError,
  isOfflineError,
} from './errors';

// 型定義
export type {
  NewsItem,
  NewsData,
  TermDifficulty,
  TermItem,
  TermsData,
  BatchMetadata,
  FirestoreQueryResult,
  FirestoreClientConfig,
} from './types';

export {
  DEFAULT_FIRESTORE_CLIENT_CONFIG,
  COLLECTIONS,
  METADATA_DOC_ID,
} from './types';
