/**
 * テーマシステムの型定義
 *
 * アプリ全体で使用されるテーマ関連の型を定義。
 * ダークモード・ライトモード対応のための色定義と状態管理に使用する。
 *
 * @see Requirements: 6.5 (ダークモード・ライトモード対応)
 */

/**
 * テーマモード
 * システム設定またはユーザー設定に基づくテーマの種類
 */
export type ThemeMode = 'light' | 'dark';

/**
 * テーマカラー定義
 * アプリ全体で使用される色を一元管理するための型
 *
 * 各プロパティはHEX形式(#RRGGBB)で定義される
 */
export interface ThemeColors {
  /** 主要背景色 */
  background: string;
  /** 二次背景色(カード内、セクション区切り等) */
  backgroundSecondary: string;

  /** 主要テキスト色 */
  text: string;
  /** 二次テキスト色(説明文、補足情報等) */
  textSecondary: string;

  /** プライマリ色(アクセントカラー) */
  primary: string;
  /** プライマリ色上のテキスト */
  primaryText: string;

  /** カード背景色 */
  card: string;
  /** カードボーダー色 */
  cardBorder: string;

  /** 汎用ボーダー色 */
  border: string;

  /** タブバー背景色 */
  tabBarBackground: string;
  /** タブバーアクティブアイコン・ラベル色 */
  tabBarActive: string;
  /** タブバー非アクティブアイコン・ラベル色 */
  tabBarInactive: string;

  /** ヘッダー背景色 */
  headerBackground: string;
  /** ヘッダーテキスト色 */
  headerText: string;

  /** エラー背景色 */
  error: string;
  /** エラーテキスト色 */
  errorText: string;
}

/**
 * テーマコンテキストの値型
 * ThemeProviderが提供するコンテキスト値の型定義
 */
export interface ThemeContextValue {
  /** 現在のテーマモード */
  mode: ThemeMode;
  /** ダークモードかどうかの判定ヘルパー */
  isDark: boolean;
  /** 現在のテーマに応じた色定義 */
  colors: ThemeColors;
}
