/**
 * ニュースタブ画面
 * Task 19: News View
 *
 * 日次のニュース要約（世界・日本）を表示するメイン画面。
 * Expo Routerのファイルベースルーティングで、デフォルトタブ（index）として設定。
 *
 * MVVM パターンに従い、NewsViewModelから状態を取得し、
 * NewsScreenコンポーネントに渡してUIをレンダリングします。
 *
 * ThemeProviderから提供される一元管理された色定義を使用して、
 * ダークモード・ライトモードに対応する。
 *
 * @description
 * - 世界のニュース要約を表示
 * - 日本のニュース要約を表示
 * - 更新日時を表示
 * - ローディング・エラー状態をハンドリング
 *
 * @see Requirements: 2.1, 2.2, 2.3, 6.5, 7.5
 * @see design.md - Architecture - News Feature
 */

import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { useNewsViewModel, NewsScreen } from '../../src/news';

/**
 * ニュースタブ画面のルートコンポーネント
 *
 * MVVMパターン:
 * - useNewsViewModel: ViewModelからニュース状態を取得
 * - NewsScreen: UIを担当するViewコンポーネント
 *
 * StatusBarはテーマに応じてスタイルを切り替えます。
 */
export default function NewsTab() {
  // テーマ情報を取得（StatusBar用）
  const { isDark } = useTheme();

  // ViewModelからニュース状態を取得
  const viewModelResult = useNewsViewModel();

  return (
    <>
      {/* ステータスバーのスタイルをテーマに合わせる */}
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ニュース画面 - ViewModelの結果を渡して表示 */}
      <NewsScreen viewModelResult={viewModelResult} />
    </>
  );
}
