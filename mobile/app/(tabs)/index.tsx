/**
 * ニュースタブ画面
 *
 * 日次のニュース要約（世界・日本）を表示するメイン画面。
 * Expo Routerのファイルベースルーティングで、デフォルトタブ（index）として設定。
 *
 * ThemeProviderから提供される一元管理された色定義を使用して、
 * ダークモード・ライトモードに対応する。
 *
 * @description
 * - 世界のニュース要約を表示
 * - 日本のニュース要約を表示
 * - 更新日時を表示
 *
 * @see Requirements: 2.1, 2.2, 6.5 (ニュース表示、ダークモード対応)
 */

import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';

/**
 * ニュース画面コンポーネント
 * 将来的にNews ViewModelと連携して、Firestoreからデータを取得・表示する
 */
export default function NewsScreen() {
  // ThemeProviderから一元管理されたテーマ情報を取得
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
          ニュース機能は現在開発中です。{'\n'}
          世界と日本の投資ニュース要約がここに表示されます。
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
