/**
 * パフォーマンス最適化モジュール
 * Task 25: パフォーマンス最適化
 *
 * アプリ起動時間の最適化とキャッシュパフォーマンスの改善を提供する。
 *
 * @see Requirements: 7.1, 7.2
 */

// アプリ起動パフォーマンス関連のエクスポート
export {
  APP_STARTUP_CONFIG,
  TAB_LAZY_CONFIG,
  measureStartupTime,
  logPerformance,
} from './app-startup';

export type { StartupTimeResult } from './app-startup';
