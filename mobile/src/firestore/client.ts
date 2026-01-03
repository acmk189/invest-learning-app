/**
 * Firestore クライアント
 * Task 14.1, 14.3: Firestore接続初期化、オフライン永続化設定
 *
 * React Nativeアプリ用のFirestoreクライアントを提供します。
 * オフライン永続化とキャッシュサイズの設定を管理します。
 *
 * Requirements:
 * - 12.3: Firebase Firestoreを使用する
 * - 2.5: オフライン状態でキャッシュ済みのニュースを表示する
 *
 * @see https://rnfirebase.io/firestore/usage
 */

import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {
  FirestoreClientConfig,
  DEFAULT_FIRESTORE_CLIENT_CONFIG,
} from './types';
import { toFirestoreError, logFirestoreError } from './errors';

/**
 * Firestoreクライアントクラス
 *
 * シングルトンパターンでアプリ全体で共有されるFirestore接続を管理します。
 * 初期化時にオフライン永続化とキャッシュサイズを設定します。
 */
export class FirestoreClient {
  /** 初期化済みフラグ */
  private initialized: boolean = false;
  /** 現在の設定 */
  private config: FirestoreClientConfig = DEFAULT_FIRESTORE_CLIENT_CONFIG;

  /**
   * Firestoreを初期化する
   *
   * オフライン永続化とキャッシュサイズを設定します。
   * 二度呼び出しても設定は一度のみ適用されます。
   *
   * @param config - Firestore設定（オプション）
   * @throws {FirestoreError} 初期化失敗時
   *
   * @example
   * ```typescript
   * const client = new FirestoreClient();
   * await client.initialize();
   * ```
   */
  async initialize(config?: Partial<FirestoreClientConfig>): Promise<void> {
    // 二重初期化を防止
    if (this.initialized) {
      console.log('[FirestoreClient] Already initialized, skipping');
      return;
    }

    // 設定をマージ
    this.config = { ...DEFAULT_FIRESTORE_CLIENT_CONFIG, ...config };

    try {
      // Firestore設定を適用
      // persistence: オフライン永続化（データをローカルにキャッシュ）
      // cacheSizeBytes: キャッシュサイズ（デフォルト100MB）
      await firestore().settings({
        persistence: this.config.persistence,
        cacheSizeBytes: this.config.cacheSizeBytes,
      });

      this.initialized = true;

      console.log('[FirestoreClient] Initialized successfully');
      console.log(`[FirestoreClient] Persistence: ${this.config.persistence}`);
      console.log(`[FirestoreClient] Cache size: ${this.config.cacheSizeBytes} bytes`);
    } catch (error) {
      const firestoreError = toFirestoreError(error);
      logFirestoreError(firestoreError, 'FirestoreClient.initialize');
      throw firestoreError;
    }
  }

  /**
   * 初期化済みかどうかを確認する
   *
   * @returns 初期化済みの場合true
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 現在の設定を取得する
   *
   * @returns Firestore設定
   */
  getConfig(): FirestoreClientConfig {
    return { ...this.config };
  }

  /**
   * Firestoreインスタンスを取得する
   *
   * @returns FirebaseFirestoreTypes.Module
   */
  getFirestore(): FirebaseFirestoreTypes.Module {
    return firestore();
  }
}

/**
 * デフォルトのFirestoreクライアント（シングルトン）
 */
let defaultClient: FirestoreClient | null = null;

/**
 * デフォルトのFirestoreクライアントを取得する
 *
 * シングルトンパターンでアプリ全体で共有されるクライアントを返します。
 *
 * @returns FirestoreClient
 *
 * @example
 * ```typescript
 * const client = getDefaultFirestoreClient();
 * await client.initialize();
 * ```
 */
export function getDefaultFirestoreClient(): FirestoreClient {
  if (!defaultClient) {
    defaultClient = new FirestoreClient();
  }
  return defaultClient;
}

/**
 * Firestoreが初期化済みかどうかを確認する
 *
 * @returns 初期化済みの場合true
 */
export function isFirestoreInitialized(): boolean {
  return defaultClient?.isInitialized() ?? false;
}

/**
 * Firestoreを初期化する（ショートカット関数）
 *
 * デフォルトクライアントを使用してFirestoreを初期化します。
 *
 * @param config - Firestore設定（オプション）
 * @throws {FirestoreError} 初期化失敗時
 *
 * @example
 * ```typescript
 * await initializeFirestoreClient();
 * ```
 */
export async function initializeFirestoreClient(
  config?: Partial<FirestoreClientConfig>
): Promise<void> {
  const client = getDefaultFirestoreClient();
  await client.initialize(config);
}

/**
 * Firestoreインスタンスを取得する（ショートカット関数）
 *
 * デフォルトクライアントからFirestoreインスタンスを取得します。
 *
 * @returns FirebaseFirestoreTypes.Module
 */
export function getFirestoreInstance(): FirebaseFirestoreTypes.Module {
  return getDefaultFirestoreClient().getFirestore();
}
