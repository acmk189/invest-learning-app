/**
 * アプリケーションのルートレイアウト
 *
 * Expo Routerのエントリーポイントとして機能し、
 * 全画面で共有されるプロバイダーやグローバル設定を提供する。
 *
 * @see https://docs.expo.dev/router/layouts/
 */

import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { ThemeProvider } from '../src/theme';
import { initializeSupabaseClient } from '../src/supabase';

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
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // アプリ起動時にSupabaseを初期化
  useEffect(() => {
    async function initializeApp() {
      try {
        const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
        const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error(
            '環境変数が設定されていません。.env.local を確認してください。'
          );
        }

        await initializeSupabaseClient({
          url: supabaseUrl,
          anonKey: supabaseAnonKey,
        });

        console.log('[App] Supabase initialized successfully');
        setIsReady(true);
      } catch (error) {
        console.error('[App] Failed to initialize Supabase:', error);
        setInitError(
          error instanceof Error ? error.message : '初期化に失敗しました'
        );
        setIsReady(true); // エラーでも画面を表示
      }
    }

    initializeApp();
  }, []);

  // 初期化中はローディング表示
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 初期化エラー時はエラー表示
  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>{initError}</Text>
      </View>
    );
  }

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
