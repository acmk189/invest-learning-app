/**
 * タブナビゲーションレイアウト
 *
 * Expo Routerのファイルベースルーティングを使用して、
 * 「ニュース」と「用語」の2つのタブを提供するレイアウトコンポーネント。
 *
 * @see https://docs.expo.dev/router/advanced/tabs/
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

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
  // システムのカラースキーム（ダークモード/ライトモード）を取得
  const colorScheme = useColorScheme();

  // ダークモード対応の色設定
  const isDark = colorScheme === 'dark';
  const tabBarActiveTintColor = isDark ? '#60a5fa' : '#2563eb'; // blue-400 / blue-600
  const tabBarInactiveTintColor = isDark ? '#9ca3af' : '#6b7280'; // gray-400 / gray-500
  const tabBarBackgroundColor = isDark ? '#1f2937' : '#ffffff'; // gray-800 / white
  const headerBackgroundColor = isDark ? '#111827' : '#f9fafb'; // gray-900 / gray-50
  const headerTintColor = isDark ? '#f9fafb' : '#111827'; // gray-50 / gray-900

  return (
    <Tabs
      screenOptions={{
        // タブバー全体のスタイル設定
        tabBarActiveTintColor,
        tabBarInactiveTintColor,
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopWidth: 1,
          borderTopColor: isDark ? '#374151' : '#e5e7eb', // gray-700 / gray-200
        },
        // ヘッダーのスタイル設定
        headerStyle: {
          backgroundColor: headerBackgroundColor,
        },
        headerTintColor,
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
