/**
 * News Screen コンポーネント
 * Task 19.1, 19.2, 19.3, 19.4: ニュース画面UI実装
 *
 * MVVM パターンにおける View 層。
 * NewsViewModelResult を受け取り、ニュースを表示します。
 *
 * Requirements:
 * - 2.1: アプリ起動時当日ニュース表示
 * - 2.2: 世界・日本2カテゴリ表示
 * - 2.3: タイトル・要約・更新日時表示
 * - 7.5: エラー時リトライオプション提供
 * - 6.3: iOS各サイズ対応
 * - 6.4: 可読性確保
 *
 * @see design.md - Architecture - News Feature
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useThemeColors } from '../theme';
import { NewsItem } from '../firestore/types';
import { NewsViewModelResult } from './news-viewmodel';

/**
 * NewsScreenのプロパティ
 * ViewModelの結果を受け取り、純粋なUIコンポーネントとして動作
 */
interface NewsScreenProps {
  /** ViewModelから提供される状態と関数 */
  viewModelResult: NewsViewModelResult;
}

/**
 * ニュースカードのプロパティ
 */
interface NewsCardProps {
  /** カテゴリタイトル（世界のニュース/日本のニュース） */
  categoryTitle: string;
  /** ニュースデータ */
  news: NewsItem;
}

/**
 * 日時をフォーマットする関数
 * ISO 8601形式の日時文字列を「YYYY/MM/DD HH:MM」形式に変換
 *
 * @param isoString - ISO 8601形式の日時文字列
 * @returns フォーマットされた日時文字列
 */
const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

/**
 * ニュースカードコンポーネント
 * 各ニュースのタイトル、要約、更新日時を表示
 *
 * @see Requirements: 2.3
 */
function NewsCard({ categoryTitle, news }: NewsCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      {/* カテゴリタイトル（世界のニュース / 日本のニュース） */}
      <Text style={[styles.categoryTitle, { color: colors.primary }]}>
        {categoryTitle}
      </Text>

      {/* ニュースタイトル */}
      <Text style={[styles.newsTitle, { color: colors.text }]}>
        {news.title}
      </Text>

      {/* 更新日時 */}
      <Text style={[styles.updatedAt, { color: colors.textSecondary }]}>
        更新: {formatDateTime(news.updatedAt)}
      </Text>

      {/* 要約本文 */}
      <Text style={[styles.summary, { color: colors.text }]}>
        {news.summary}
      </Text>
    </View>
  );
}

/**
 * ローディング表示コンポーネント
 * データ取得中にスピナーを表示
 */
function LoadingView() {
  const colors = useThemeColors();

  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator
        testID="loading-indicator"
        size="large"
        color={colors.primary}
      />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        ニュースを読み込んでいます...
      </Text>
    </View>
  );
}

/**
 * エラー表示コンポーネント
 * エラーメッセージとリトライボタンを表示
 *
 * @see Requirements: 7.5
 */
interface ErrorViewProps {
  /** エラーメッセージ */
  message: string;
  /** リトライ可能かどうか */
  retryable: boolean;
  /** リトライ関数 */
  onRetry: () => void;
}

function ErrorView({ message, retryable, onRetry }: ErrorViewProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.centerContainer}>
      <View
        style={[
          styles.errorContainer,
          {
            backgroundColor: colors.error,
            borderColor: colors.errorText,
          },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.errorText }]}>
          {message}
        </Text>
        {retryable && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
            activeOpacity={0.7}
          >
            <Text style={[styles.retryButtonText, { color: colors.primaryText }]}>
              再試行
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * ニュース画面コンポーネント
 *
 * ViewModelから提供される状態に基づいて、
 * ローディング、エラー、ニュース表示を切り替えます。
 *
 * @param props - NewsScreenProps
 * @returns ニュース画面のReactコンポーネント
 */
export function NewsScreen({ viewModelResult }: NewsScreenProps) {
  const colors = useThemeColors();
  const { state, loading, worldNews, japanNews, error, retry } = viewModelResult;

  // ローディング中
  if (loading) {
    return (
      <View
        testID="news-container"
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <LoadingView />
      </View>
    );
  }

  // エラー状態
  if (state === 'error' && error) {
    return (
      <View
        testID="news-container"
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ErrorView
          message={error.message}
          retryable={error.retryable}
          onRetry={retry}
        />
      </View>
    );
  }

  // 成功状態: ニュース表示
  return (
    <View
      testID="news-container"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        testID="news-scroll-view"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* 世界のニュース */}
        {worldNews && (
          <NewsCard categoryTitle="世界のニュース" news={worldNews} />
        )}

        {/* 日本のニュース */}
        {japanNews && (
          <NewsCard categoryTitle="日本のニュース" news={japanNews} />
        )}

        {/* データがない場合のメッセージ */}
        {!worldNews && !japanNews && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              本日のニュースはまだ配信されていません。
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * スタイル定義
 *
 * フォントサイズと行間は可読性を確保するため、
 * iOS Human Interface Guidelinesに準拠した値を使用
 *
 * @see Requirements: 6.3, 6.4
 */
const styles = StyleSheet.create({
  // コンテナ
  container: {
    flex: 1,
  },

  // スクロールビュー
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // センター配置コンテナ（ローディング・エラー用）
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // カード
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    // iOS向けシャドウ
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android向けエレベーション
    elevation: 2,
  },

  // カテゴリタイトル（世界のニュース / 日本のニュース）
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ニュースタイトル
  newsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 26,
  },

  // 更新日時
  updatedAt: {
    fontSize: 12,
    marginBottom: 12,
  },

  // 要約本文
  summary: {
    fontSize: 16,
    lineHeight: 26, // 行間1.625倍（可読性確保）
    textAlign: 'justify',
  },

  // ローディング
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // エラー
  errorContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    maxWidth: '90%',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // 空状態
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
