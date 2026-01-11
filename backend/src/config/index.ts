/**
 * 設定モジュールのエクスポート
 *
 * Supabase設定と環境変数管理を統合的にエクスポートします。
 * Task 12: Firebase依存の完全削除
 */

// Supabase設定
export {
  getSupabase,
  resetSupabaseClient,
  validateSupabaseConfig,
  healthCheck,
  type SupabaseConfigValidation,
} from './supabase';

// 環境変数管理
export {
  validateAllEnvVars,
  getEnvVarStatus,
  generateEnvVarErrorMessage,
  getSupabaseEnvConfig,
  isSupabaseConfigured,
  ENV_VAR_CONFIG,
  type EnvVarName,
  type EnvVarInfo,
  type EnvVarStatus,
  type EnvVarValidationResult,
  type SupabaseEnvConfig,
} from './envConfig';
