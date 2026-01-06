/**
 * 用語タブ画面
 *
 * 日次の投資・金融用語（3つ）を表示する画面。
 * Expo Routerのファイルベースルーティングで設定。
 *
 * @description
 * - 3つの投資用語を表示
 * - 各用語の解説（約500文字）を表示
 */

import { StyleSheet, Text, View, ScrollView, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

/**
 * 用語画面コンポーネント
 * 将来的にTerms ViewModelと連携して、Firestoreからデータを取得・表示する
 */
export default function TermsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // ダークモード対応のスタイル
  const containerStyle = {
    ...styles.container,
    backgroundColor: isDark ? '#111827' : '#f9fafb',
  };

  const textStyle = {
    ...styles.placeholderText,
    color: isDark ? '#d1d5db' : '#4b5563',
  };

  return (
    <View style={containerStyle}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={textStyle}>
          用語機能は現在開発中です。{'\n'}
          今日の3つの投資用語がここに表示されます。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
