/**
 * Supabase クライアント
 * Task 8.2, 8.3: Supabaseクライアント初期化、接続テスト機能
 *
 * React Nativeアプリ用のSupabaseクライアントを提供します。
 * anon keyを使用してRLSで保護されたデータにアクセスします。
 *
 * Requirements:
 * - 7: フロントエンドSupabaseクライアント実装
 * - 7.2: anon keyによるクライアントサイド認証設定
 * - 7.4: 接続テスト機能を実装する
 *
 * @see https://supabase.com/docs/reference/javascript/introduction
 */

import { createClient, SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';
import {
  SupabaseClientConfig,
  DEFAULT_SUPABASE_CLIENT_CONFIG,
  TABLES,
} from './types';

/**
 * Supabase初期化パラメータ
 *
 * 環境変数から読み込むURL・キー情報と、オプションの設定を含む
 */
export interface SupabaseInitParams {
  /** Supabase URL */
  url: string;
  /** Supabase anon key */
  anonKey: string;
  /** 接続タイムアウト(ミリ秒) */
  connectionTimeout?: number;
}

/**
 * Supabaseクライアントクラス
 *
 * シングルトンパターンでアプリ全体で共有されるSupabase接続を管理します。
 * React Native向けに最適化された設定を適用します。
 */
export class SupabaseClient {
  /** 初期化済みフラグ */
  private initialized: boolean = false;
  /** 現在の設定 */
  private config: SupabaseClientConfig = {
    url: '',
    anonKey: '',
    ...DEFAULT_SUPABASE_CLIENT_CONFIG,
  };
  /** Supabase SDKクライアントインスタンス */
  private client: SupabaseSDKClient | null = null;

  /**
   * Supabaseを初期化する
   *
   * anon keyを使用してクライアントを初期化します。
   * React Native向けに detectSessionInUrl: false を設定します。
   * 二度呼び出しても設定は一度のみ適用されます。
   *
   * @param params - Supabase初期化パラメータ
   * @throws {Error} URL未設定時
   * @throws {Error} anon key未設定時
   *
   * @example
   * ```typescript
   * const client = new SupabaseClient();
   * await client.initialize({
   *   url: 'https://xxx.supabase.co',
   *   anonKey: 'your-anon-key',
   * });
   * ```
   */
  async initialize(params: SupabaseInitParams): Promise<void> {
    // 二重初期化を防止
    if (this.initialized) {
      console.log('[SupabaseClient] Already initialized, skipping');
      return;
    }

    // 必須パラメータの検証
    if (!params.url) {
      throw new Error('SUPABASE_URL is required for initialization');
    }
    if (!params.anonKey) {
      throw new Error('SUPABASE_ANON_KEY is required for initialization');
    }

    // 設定をマージ
    this.config = {
      url: params.url,
      anonKey: params.anonKey,
      connectionTimeout: params.connectionTimeout ?? DEFAULT_SUPABASE_CLIENT_CONFIG.connectionTimeout,
    };

    // Supabaseクライアントを初期化
    // React Native向けの設定:
    // - detectSessionInUrl: false (ディープリンクからのセッション取得を無効化)
    // - persistSession: false (認証不要のため)
    // - autoRefreshToken: false (認証不要のため)
    // @see https://supabase.com/docs/reference/javascript/initializing
    this.client = createClient(this.config.url, this.config.anonKey, {
      auth: {
        detectSessionInUrl: false,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.initialized = true;

    console.log('[SupabaseClient] Initialized successfully');
    console.log(`[SupabaseClient] URL: ${this.config.url}`);
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
   * @returns Supabase設定
   */
  getConfig(): SupabaseClientConfig {
    return { ...this.config };
  }

  /**
   * Supabaseクライアントインスタンスを取得する
   *
   * @returns SupabaseSDKClient
   * @throws {Error} 初期化前に呼び出された場合
   */
  getClient(): SupabaseSDKClient {
    if (!this.client) {
      throw new Error('Supabase client is not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Supabase接続をテストする
   *
   * batch_metadataテーブルへの簡易クエリを実行して接続を検証します。
   *
   * @returns 接続が正常な場合true
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // batch_metadataテーブルから1件取得してみる
      // このテーブルは必ず1行存在するため、接続テストに適している
      const { error } = await this.client
        .from(TABLES.BATCH_METADATA)
        .select('id')
        .limit(1);

      // エラーがなければ接続成功
      return error === null;
    } catch {
      return false;
    }
  }

  /**
   * クライアントをリセットする(テスト用)
   *
   * テスト用およびクライアントの再初期化が必要な場合に使用します。
   * 本番コードでは通常使用しません。
   */
  reset(): void {
    this.initialized = false;
    this.client = null;
    this.config = {
      url: '',
      anonKey: '',
      ...DEFAULT_SUPABASE_CLIENT_CONFIG,
    };
  }
}

/**
 * デフォルトのSupabaseクライアント(シングルトン)
 */
let defaultClient: SupabaseClient | null = null;

/**
 * デフォルトのSupabaseクライアントを取得する
 *
 * シングルトンパターンでアプリ全体で共有されるクライアントを返します。
 *
 * @returns SupabaseClient
 *
 * @example
 * ```typescript
 * const client = getDefaultSupabaseClient();
 * await client.initialize({ url: 'xxx', anonKey: 'yyy' });
 * ```
 */
export function getDefaultSupabaseClient(): SupabaseClient {
  if (!defaultClient) {
    defaultClient = new SupabaseClient();
  }
  return defaultClient;
}

/**
 * Supabaseが初期化済みかどうかを確認する
 *
 * @returns 初期化済みの場合true
 */
export function isSupabaseInitialized(): boolean {
  return defaultClient?.isInitialized() ?? false;
}

/**
 * Supabaseを初期化する(ショートカット関数)
 *
 * デフォルトクライアントを使用してSupabaseを初期化します。
 *
 * @param params - Supabase初期化パラメータ
 * @throws {Error} 初期化失敗時
 *
 * @example
 * ```typescript
 * await initializeSupabaseClient({
 *   url: Constants.expoConfig?.extra?.supabaseUrl,
 *   anonKey: Constants.expoConfig?.extra?.supabaseAnonKey,
 * });
 * ```
 */
export async function initializeSupabaseClient(
  params: SupabaseInitParams
): Promise<void> {
  const client = getDefaultSupabaseClient();
  await client.initialize(params);
}

/**
 * Supabaseクライアントインスタンスを取得する(ショートカット関数)
 *
 * デフォルトクライアントからSupabase SDKインスタンスを取得します。
 *
 * @returns SupabaseSDKClient
 * @throws {Error} 初期化前に呼び出された場合
 */
export function getSupabaseInstance(): SupabaseSDKClient {
  return getDefaultSupabaseClient().getClient();
}

/**
 * Supabaseクライアントをリセットする(テスト用)
 *
 * シングルトンインスタンスをリセットします。
 * テスト用およびクライアントの再初期化が必要な場合に使用します。
 */
export function resetSupabaseClient(): void {
  if (defaultClient) {
    defaultClient.reset();
  }
  defaultClient = null;
}
