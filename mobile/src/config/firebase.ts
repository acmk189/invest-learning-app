/**
 * Firebase Firestore設定モジュール
 *
 * Requirements:
 * - 12.3: Firebase Firestoreを使用する
 * - 2.5: オフライン状態でキャッシュ済みのニュースを表示する
 *
 * このモジュールはFirestore接続の初期化、オフライン永続化、
 * キャッシュサイズ設定を提供します。
 */

import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

/**
 * Firestore設定オプション
 */
interface FirestoreConfig {
  /** オフライン永続化を有効化 (デフォルト: true) */
  persistence: boolean;
  /** キャッシュサイズ (バイト単位、デフォルト: 100MB) */
  cacheSizeBytes: number;
}

/**
 * デフォルトのFirestore設定
 *
 * - persistence: true (オフライン永続化を有効化)
 * - cacheSizeBytes: 100 * 1024 * 1024 (100MB)
 */
const DEFAULT_CONFIG: FirestoreConfig = {
  persistence: true,
  cacheSizeBytes: 100 * 1024 * 1024, // 100MB
};

/**
 * Firestore接続テスト結果
 */
export interface FirestoreConnectionResult {
  /** 接続成功フラグ */
  success: boolean;
  /** 成功メッセージ */
  message?: string;
  /** エラーメッセージ */
  error?: string;
}

/**
 * Firestoreを初期化する
 *
 * このメソッドは以下を実行します:
 * 1. オフライン永続化を有効化
 * 2. キャッシュサイズを設定
 * 3. Firestore設定を適用
 *
 * @param config - Firestore設定オプション (デフォルト: DEFAULT_CONFIG)
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await initializeFirestore();
 * ```
 */
export async function initializeFirestore(
  config: Partial<FirestoreConfig> = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // Firestore設定を適用
    await firestore().settings({
      persistence: finalConfig.persistence,
      cacheSizeBytes: finalConfig.cacheSizeBytes,
    });

    console.log('[Firebase] Firestore initialized successfully');
    console.log(`[Firebase] Persistence: ${finalConfig.persistence}`);
    console.log(`[Firebase] Cache size: ${finalConfig.cacheSizeBytes} bytes`);
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firestore:', error);
    throw error;
  }
}

/**
 * Firestore接続をテストする
 *
 * このメソッドはテスト用のドキュメントを書き込み・読み込みして、
 * Firestore接続が正常に動作することを確認します。
 *
 * @returns Promise<FirestoreConnectionResult> - 接続テスト結果
 *
 * @example
 * ```typescript
 * const result = await testFirestoreConnection();
 * if (result.success) {
 *   console.log(result.message);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function testFirestoreConnection(): Promise<FirestoreConnectionResult> {
  const testCollectionName = '_connection_test';
  const testDocId = `test_${Date.now()}`;

  try {
    // テストドキュメントを書き込み
    await firestore()
      .collection(testCollectionName)
      .doc(testDocId)
      .set({
        timestamp: firestore.FieldValue.serverTimestamp(),
        test: true,
      });

    // テストドキュメントを読み込み
    const doc = await firestore()
      .collection(testCollectionName)
      .doc(testDocId)
      .get();

    if (!doc.exists) {
      throw new Error('Test document not found');
    }

    // テストドキュメントを削除
    await firestore()
      .collection(testCollectionName)
      .doc(testDocId)
      .delete();

    return {
      success: true,
      message: 'Firestore接続成功: 読み書き動作が正常に機能しています',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error('[Firebase] Connection test failed:', errorMessage);

    return {
      success: false,
      error: `Firestore接続エラー: ${errorMessage}`,
    };
  }
}

/**
 * Firestoreインスタンスを取得する
 *
 * このヘルパー関数は、アプリケーション全体で一貫したFirestoreインスタンスを
 * 取得するために使用します。
 *
 * @returns FirebaseFirestoreTypes.Module - Firestoreインスタンス
 *
 * @example
 * ```typescript
 * const db = getFirestore();
 * const newsCollection = db.collection('news');
 * ```
 */
export function getFirestore(): FirebaseFirestoreTypes.Module {
  return firestore();
}

/**
 * Firestoreコレクション名の定数定義
 */
export const FIRESTORE_COLLECTIONS = {
  /** ニュースコレクション */
  NEWS: 'news',
  /** 投資用語コレクション */
  TERMS: 'terms',
  /** 投資用語履歴コレクション */
  TERMS_HISTORY: 'terms_history',
  /** エラーログコレクション */
  ERROR_LOGS: 'error_logs',
} as const;
