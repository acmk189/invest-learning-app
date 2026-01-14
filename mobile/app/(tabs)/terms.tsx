/**
 * 用語タブ画面
 * Task 23: Terms View
 *
 * 日次の投資・金融用語（3つ）を表示する画面。
 * Expo Routerのファイルベースルーティングで設定。
 *
 * MVVM パターンに従い、TermsViewModelから状態を取得し、
 * TermsScreenコンポーネントに渡してUIをレンダリングします。
 *
 * ThemeProviderから提供される一元管理された色定義を使用して、
 * ダークモード・ライトモードに対応する。
 *
 * @description
 * - 3つの投資用語を表示
 * - 各用語の解説（約500文字）を表示
 * - ローディング・エラー状態をハンドリング
 *
 * @see Requirements: 5.1, 5.2, 6.5, 7.5 (用語表示、ダークモード対応、エラーリトライ)
 * @see design.md - Architecture - Terms Feature
 */

import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme';
import { useTermsViewModel, TermsScreen } from '../../src/terms';

/**
 * 用語タブ画面のルートコンポーネント
 *
 * MVVMパターン:
 * - useTermsViewModel: ViewModelから用語状態を取得
 * - TermsScreen: UIを担当するViewコンポーネント
 *
 * StatusBarはテーマに応じてスタイルを切り替えます。
 */
export default function TermsTab() {
  // テーマ情報を取得（StatusBar用）
  const { isDark } = useTheme();

  // ViewModelから用語状態を取得
  const viewModelResult = useTermsViewModel();

  return (
    <>
      {/* ステータスバーのスタイルをテーマに合わせる */}
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 用語画面 - ViewModelの結果を渡して表示 */}
      <TermsScreen viewModelResult={viewModelResult} />
    </>
  );
}
