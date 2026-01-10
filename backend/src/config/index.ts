/**
 * 設定モジュールのエクスポート
 *
 * Firebase設定、Supabase設定、環境変数管理を統合的にエクスポートします。
 */

// Firebase Admin SDK設定(移行後は削除予定)
export {
  initializeFirebase,
  getFirestore,
  getFirebaseApp,
} from './firebase';

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
