/**
 * Supabase クライアント初期化
 *
 * Task 3.2: Supabaseクライアント初期化実装
 * Task 3.3: ヘルスチェック機能実装
 * Requirements: 3
 *
 * service_role keyを使用してSupabaseサーバーサイド接続を確立します。
 * シングルトンパターンで接続を管理し、環境変数から設定を読み込みます。
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnvConfig } from './envConfig';

/**
 * Supabaseクライアントのシングルトンインスタンス
 */
let supabaseClient: SupabaseClient | undefined;

/**
 * Supabase設定検証結果
 */
export interface SupabaseConfigValidation {
  /** 設定が有効かどうか */
  isValid: boolean;
  /** Supabase URL(有効な場合) */
  url?: string;
  /** エラーメッセージ(無効な場合) */
  error?: string;
}

/**
 * Supabase設定を検証する
 *
 * 環境変数が正しく設定されているかを確認します。
 * この関数はヘルスチェックエンドポイントで使用します。
 *
 * @returns 検証結果
 */
export function validateSupabaseConfig(): SupabaseConfigValidation {
  try {
    const config = getSupabaseEnvConfig();
    return {
      isValid: true,
      url: config.url,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * Supabaseクライアントを取得
 *
 * シングルトンパターンでSupabaseクライアントを返します。
 * 初回呼び出し時に環境変数から設定を読み込んで初期化します。
 *
 * @returns SupabaseClientインスタンス
 * @throws 環境変数が不足している場合
 */
export function getSupabase(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const config = getSupabaseEnvConfig();

  // Supabaseクライアントを初期化
  // service_role keyを使用してRLSをバイパス
  supabaseClient = createClient(config.url, config.secretKey, {
    auth: {
      // サーバーサイドでの使用のため、セッション永続化は無効
      persistSession: false,
      // 自動リフレッシュは無効
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

/**
 * Supabaseクライアントをリセット
 *
 * テスト用およびクライアントの再初期化が必要な場合に使用します。
 * 本番コードでは通常使用しません。
 */
export function resetSupabaseClient(): void {
  supabaseClient = undefined;
}

/**
 * Supabase接続ヘルスチェック
 *
 * Supabaseへの接続が正常かどうかを確認します。
 * batch_metadataテーブルへの簡易クエリを実行して接続を検証します。
 *
 * @returns 接続が正常な場合true
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const client = getSupabase();

    // batch_metadataテーブルから1件取得してみる
    // このテーブルは必ず1行存在するため、接続テストに適している
    const { error } = await client
      .from('batch_metadata')
      .select('id')
      .limit(1);

    // エラーがなければ接続成功
    return error === null;
  } catch {
    return false;
  }
}
