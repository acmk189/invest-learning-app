/**
 * テーマプロバイダー
 *
 * React Contextを使用してアプリ全体にテーマ情報を提供する。
 * iOS端末のシステム設定（ダークモード/ライトモード）を自動検出し、
 * 適切なテーマカラーを各コンポーネントに提供する。
 *
 * @example
 * // アプリのルートレイアウトでの使用
 * import { ThemeProvider } from '@/src/theme';
 *
 * export default function RootLayout() {
 *   return (
 *     <ThemeProvider>
 *       <Stack />
 *     </ThemeProvider>
 *   );
 * }
 *
 * @example
 * // コンポーネントでのテーマ使用
 * import { useTheme, useThemeColors } from '@/src/theme';
 *
 * function MyComponent() {
 *   const { isDark, colors } = useTheme();
 *   // または
 *   const colors = useThemeColors();
 *
 *   return (
 *     <View style={{ backgroundColor: colors.background }}>
 *       <Text style={{ color: colors.text }}>Hello</Text>
 *     </View>
 *   );
 * }
 *
 * @see Requirements: 6.5 (ダークモード・ライトモード対応)
 * @see https://reactnative.dev/docs/usecolorscheme
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemeContextValue, ThemeMode } from './types';
import { getThemeColors } from './colors';

/**
 * テーマコンテキスト
 * 初期値はundefinedで、プロバイダー外での使用を検出する
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * ThemeProviderのプロパティ
 */
interface ThemeProviderProps {
  /** 子コンポーネント */
  children: ReactNode;
}

/**
 * テーマプロバイダーコンポーネント
 *
 * アプリケーションのルートレイアウトでラップして使用する。
 * システムのカラースキーム変更を自動的に検知し、テーマを更新する。
 *
 * @param props - ThemeProviderProps
 * @returns テーマコンテキストを提供するProviderコンポーネント
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // システムのカラースキームを取得（'light' | 'dark' | null）
  // @see https://reactnative.dev/docs/usecolorscheme
  const systemColorScheme = useColorScheme();

  // テーマコンテキスト値をメモ化（パフォーマンス最適化）
  const contextValue = useMemo<ThemeContextValue>(() => {
    // nullの場合はライトモードをデフォルトとする
    const mode: ThemeMode = systemColorScheme === 'dark' ? 'dark' : 'light';
    const isDark = mode === 'dark';
    const colors = getThemeColors(isDark);

    return {
      mode,
      isDark,
      colors,
    };
  }, [systemColorScheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * テーマ情報を取得するカスタムフック
 *
 * ThemeProvider内で使用し、現在のテーマモード、isDark判定、色定義を取得する。
 *
 * @throws Error - ThemeProvider外で使用された場合
 * @returns ThemeContextValue - テーマ情報
 *
 * @example
 * const { mode, isDark, colors } = useTheme();
 * console.log(mode); // 'light' or 'dark'
 * console.log(isDark); // false or true
 * console.log(colors.background); // '#f9fafb' or '#111827'
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * テーマカラーのみを取得するカスタムフック
 *
 * useThemeの簡易版。色定義のみが必要な場合に使用する。
 *
 * @throws Error - ThemeProvider外で使用された場合
 * @returns ThemeColors - 現在のテーマに応じた色定義
 *
 * @example
 * const colors = useThemeColors();
 * return <View style={{ backgroundColor: colors.card }} />;
 */
export function useThemeColors() {
  const { colors } = useTheme();
  return colors;
}
