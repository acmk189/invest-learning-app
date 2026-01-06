/**
 * テーマモジュールのエクスポート
 *
 * テーマプロバイダー、フック、型定義、色定義を一元的にエクスポート。
 *
 * @example
 * // 推奨インポート方法
 * import { ThemeProvider, useTheme, useThemeColors } from '@/src/theme';
 * import type { ThemeMode, ThemeColors } from '@/src/theme';
 *
 * @see Requirements: 6.5 (ダークモード・ライトモード対応)
 */

// プロバイダーとフック
export { ThemeProvider, useTheme, useThemeColors } from './theme-provider';

// 型定義
export type { ThemeMode, ThemeColors, ThemeContextValue } from './types';

// 色定義（直接使用する場合のみインポート）
export { lightColors, darkColors, getThemeColors } from './colors';
