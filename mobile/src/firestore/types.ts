/**
 * Firestore クライアント型定義
 * Task 14: フロントエンド - Firestoreクライアント
 *
 * このファイルはモバイルアプリ用のFirestoreデータモデル型を定義します。
 * バックエンドのモデルと互換性を持ちながら、フロントエンド固有の型変換を提供します。
 *
 * Requirements:
 * - 12.3: Firebase Firestoreを使用する
 * - 2.1: アプリ起動時当日ニュース表示
 * - 5.1: 用語タブで3つ表示
 */

/**
 * ニュースアイテム(世界・日本共通)
 * バックエンドのWorldNews/JapanNewsに対応
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
 * Firestoreパス: news/{date}
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
 * 用語の難易度
 */
export type TermDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * 投資・金融用語アイテム
 */
export interface TermItem {
  /** 用語名 */
  name: string;
  /** 解説文(約500文字) */
  description: string;
  /** 難易度 */
  difficulty: TermDifficulty;
}

/**
 * 用語データ
 * Firestoreパス: terms/{date}
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
 * バッチメタデータ
 * Firestoreパス: metadata/batch
 * キャッシュ有効性チェックに使用
 */
export interface BatchMetadata {
  /** ニュースバッチの最終更新時刻(Unixタイムスタンプ、ミリ秒) */
  newsLastUpdated: number;
  /** 用語バッチの最終更新時刻(Unixタイムスタンプ、ミリ秒) */
  termsLastUpdated: number;
}

/**
 * Firestoreクエリ結果
 */
export interface FirestoreQueryResult<T> {
  /** 取得したデータ(見つからない場合はnull) */
  data: T | null;
  /** データが見つかったかどうか */
  exists: boolean;
}

/**
 * Firestore接続設定
 */
export interface FirestoreClientConfig {
  /** オフライン永続化を有効化(デフォルト: true) */
  persistence: boolean;
  /** キャッシュサイズ(バイト単位、デフォルト: 100MB) */
  cacheSizeBytes: number;
  /** 接続タイムアウト(ミリ秒、デフォルト: 10000) */
  connectionTimeout: number;
}

/**
 * デフォルトのFirestoreクライアント設定
 */
export const DEFAULT_FIRESTORE_CLIENT_CONFIG: FirestoreClientConfig = {
  persistence: true,
  cacheSizeBytes: 100 * 1024 * 1024, // 100MB
  connectionTimeout: 10000, // 10秒
};

/**
 * Firestoreコレクション名の定数定義
 */
export const COLLECTIONS = {
  /** ニュースコレクション */
  NEWS: 'news',
  /** 投資用語コレクション */
  TERMS: 'terms',
  /** メタデータコレクション */
  METADATA: 'metadata',
} as const;

/**
 * メタデータドキュメントID
 */
export const METADATA_DOC_ID = {
  /** バッチメタデータ */
  BATCH: 'batch',
} as const;
