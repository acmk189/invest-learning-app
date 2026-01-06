/**
 * 用語タブ画面
 *
 * 日次の投資・金融用語（3つ）を表示する画面。
 * Expo Routerのファイルベースルーティングで設定。
 *
 * ThemeProviderから提供される一元管理された色定義を使用して、
 * ダークモード・ライトモードに対応する。
 *
 * @description
 * - 3つの投資用語を表示
 * - 各用語の解説（約500文字）を表示
 *
 * @see Requirements: 5.1, 5.2, 6.5 (用語表示、ダークモード対応)
 */

import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';

/**
 * 用語画面コンポーネント
 * 将来的にTerms ViewModelと連携して、Firestoreからデータを取得・表示する
 */
export default function TermsScreen() {
  // ThemeProviderから一元管理されたテーマ情報を取得
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
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
