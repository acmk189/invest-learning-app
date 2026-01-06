/**
 * テーマ色定義
 *
 * ライトモード・ダークモードそれぞれの色を定義。
 * Tailwind CSSのカラーパレットをベースに、iOS Human Interface Guidelinesに準拠した
 * 可読性と視認性を確保する色設計を行っている。
 *
 * @see Requirements: 6.5 (ダークモード・ライトモード対応)
 * @see https://tailwindcss.com/docs/customizing-colors
 * @see https://developer.apple.com/design/human-interface-guidelines/color
 */

import type { ThemeColors } from './types';

/**
 * ライトモード用カラーパレット
 *
 * 明るい背景に暗いテキストを使用し、可読性を確保。
 * gray-50〜gray-900のTailwindカラーをベースに構成。
 */
export const lightColors: ThemeColors = {
  // 背景色
  background: '#f9fafb', // gray-50: 主要背景
  backgroundSecondary: '#f3f4f6', // gray-100: 二次背景

  // テキスト色
  text: '#111827', // gray-900: 主要テキスト
  textSecondary: '#4b5563', // gray-600: 二次テキスト

  // プライマリ色（ブルー系）
  primary: '#2563eb', // blue-600: プライマリ
  primaryText: '#ffffff', // white: プライマリ上のテキスト

  // カード
  card: '#ffffff', // white: カード背景
  cardBorder: '#e5e7eb', // gray-200: カードボーダー

  // ボーダー
  border: '#e5e7eb', // gray-200: 汎用ボーダー

  // タブバー
  tabBarBackground: '#ffffff', // white: タブバー背景
  tabBarActive: '#2563eb', // blue-600: アクティブタブ
  tabBarInactive: '#6b7280', // gray-500: 非アクティブタブ

  // ヘッダー
  headerBackground: '#f9fafb', // gray-50: ヘッダー背景
  headerText: '#111827', // gray-900: ヘッダーテキスト

  // エラー
  error: '#fef2f2', // red-50: エラー背景
  errorText: '#dc2626', // red-600: エラーテキスト
};

/**
 * ダークモード用カラーパレット
 *
 * 暗い背景に明るいテキストを使用し、目の疲労を軽減。
 * gray-700〜gray-900のTailwindカラーをベースに構成。
 */
export const darkColors: ThemeColors = {
  // 背景色
  background: '#111827', // gray-900: 主要背景
  backgroundSecondary: '#1f2937', // gray-800: 二次背景

  // テキスト色
  text: '#f9fafb', // gray-50: 主要テキスト
  textSecondary: '#d1d5db', // gray-300: 二次テキスト

  // プライマリ色（ブルー系 - ダーク向け調整）
  primary: '#60a5fa', // blue-400: プライマリ（暗背景で視認性確保）
  primaryText: '#111827', // gray-900: プライマリ上のテキスト

  // カード
  card: '#1f2937', // gray-800: カード背景
  cardBorder: '#374151', // gray-700: カードボーダー

  // ボーダー
  border: '#374151', // gray-700: 汎用ボーダー

  // タブバー
  tabBarBackground: '#1f2937', // gray-800: タブバー背景
  tabBarActive: '#60a5fa', // blue-400: アクティブタブ
  tabBarInactive: '#9ca3af', // gray-400: 非アクティブタブ

  // ヘッダー
  headerBackground: '#111827', // gray-900: ヘッダー背景
  headerText: '#f9fafb', // gray-50: ヘッダーテキスト

  // エラー
  error: '#7f1d1d', // red-900: エラー背景（ダーク向け）
  errorText: '#fca5a5', // red-300: エラーテキスト（ダーク向け視認性）
};

/**
 * テーマモードに応じた色定義を取得する
 *
 * @param isDark - ダークモードかどうか
 * @returns テーマに対応したThemeColors
 */
export const getThemeColors = (isDark: boolean): ThemeColors => {
  return isDark ? darkColors : lightColors;
};
