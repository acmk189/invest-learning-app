/**
 * アプリケーションのルートレイアウト
 *
 * Expo Routerのエントリーポイントとして機能し、
 * 全画面で共有されるプロバイダーやグローバル設定を提供する。
 *
 * @see https://docs.expo.dev/router/layouts/
 */

import { Stack } from 'expo-router';
import { ThemeProvider } from '../src/theme';

/**
 * ルートレイアウトコンポーネント
 *
 * - ThemeProviderでアプリ全体にテーマを提供
 * - Stackナビゲーションで全体を構成
 * - タブナビゲーション（(tabs)グループ）がメイン画面
 *
 * @see Requirements: 6.5 (ダークモード・ライトモード対応)
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        {/* タブナビゲーショングループ - ヘッダーは各タブで管理 */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
