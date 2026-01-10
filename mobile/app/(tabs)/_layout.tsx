/**
 * タブナビゲーションレイアウト
 * Task 25.1: Expo Router初期読み込み最適化
 *
 * Expo Routerのファイルベースルーティングを使用して、
 * 「ニュース」と「用語」の2つのタブを提供するレイアウトコンポーネント。
 *
 * ThemeProviderから提供される一元管理された色定義を使用して、
 * ダークモード・ライトモードに対応する。
 *
 * パフォーマンス最適化:
 * - TAB_LAZY_CONFIG: 遅延ロードで不要な画面の事前ロードを無効化
 * - freezeOnBlur: 非アクティブなタブをフリーズして再レンダリングを防止
 *
 * @see https://docs.expo.dev/router/advanced/tabs/
 * @see Requirements: 6.1, 6.2, 6.5, 7.1 (タブナビゲーション、起動時間最適化)
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { TAB_LAZY_CONFIG } from '../../src/performance';

/**
 * タブアイコンを取得するヘルパー関数
 * Ioniconの名前を返し、フォーカス状態に応じてアイコンのスタイルを変更する
 *
 * @param routeName - ルート名（'news' または 'terms'）
 * @param focused - タブがフォーカス状態かどうか
 * @returns Ioniconsのアイコン名
 */
const getTabIcon = (
  routeName: string,
  focused: boolean
): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case 'index':
    case 'news':
      // ニュースタブ: 新聞アイコン
      return focused ? 'newspaper' : 'newspaper-outline';
    case 'terms':
      // 用語タブ: 本のアイコン
      return focused ? 'book' : 'book-outline';
    default:
      return 'ellipse';
  }
};

/**
 * タブナビゲーションレイアウトコンポーネント
 *
 * - ニュースタブ（index）: 日次ニュース要約を表示
 * - 用語タブ: 日次投資用語を表示
 */
export default function TabLayout() {
  // ThemeProviderから一元管理されたテーマ情報を取得
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        // パフォーマンス最適化設定（TAB_LAZY_CONFIGを展開）
        // - lazy: 遅延ロードで不要な画面の事前ロードを無効化
        // - unmountOnBlur: false で再訪問時のパフォーマンスを向上
        // - freezeOnBlur: 非アクティブなタブをフリーズ
        ...TAB_LAZY_CONFIG,

        // タブバー全体のスタイル設定（ThemeProviderの色定義を使用）
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        // ヘッダーのスタイル設定
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: '600',
        },
        // iOS標準UIに準拠したタブバースタイル
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      {/* ニュースタブ（デフォルトタブ = index） */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'ニュース',
          headerTitle: '今日のニュース',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={getTabIcon('index', focused)}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 用語タブ */}
      <Tabs.Screen
        name="terms"
        options={{
          title: '用語',
          headerTitle: '今日の用語',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={getTabIcon('terms', focused)}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
