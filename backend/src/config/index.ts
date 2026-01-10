/**
 * 設定モジュールのエクスポート
 *
 * Firebase設定と環境変数管理を統合的にエクスポートします。
 */

// Firebase Admin SDK設定
export {
  initializeFirebase,
  getFirestore,
  getFirebaseApp,
} from './firebase';

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
