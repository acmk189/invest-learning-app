/**
 * ニュースタブ画面
 *
 * 日次のニュース要約（世界・日本）を表示するメイン画面。
 * Expo Routerのファイルベースルーティングで、デフォルトタブ（index）として設定。
 *
 * @description
 * - 世界のニュース要約を表示
 * - 日本のニュース要約を表示
 * - 更新日時を表示
 */

import { StyleSheet, Text, View, ScrollView, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

/**
 * ニュース画面コンポーネント
 * 将来的にNews ViewModelと連携して、Firestoreからデータを取得・表示する
 */
export default function NewsScreen() {
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
