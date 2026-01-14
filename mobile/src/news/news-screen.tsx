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

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useThemeColors, ThemeColors } from '../theme';
import { NewsItem } from '../supabase/types';
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
 * Markdown表示用のスタイルを生成する関数
 * テーマカラーに応じたスタイルを動的に生成
 *
 * @param colors - テーマカラー
 * @returns Markdownコンポーネント用のスタイルオブジェクト
 */
const createMarkdownStyles = (colors: ThemeColors) => ({
  body: {
    color: colors.text,
    fontSize: TYPOGRAPHY.BODY_FONT_SIZE,
    lineHeight: TYPOGRAPHY.BODY_LINE_HEIGHT,
  },
  heading1: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 30,
  },
  heading2: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 28,
  },
  heading3: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 26,
  },
  heading4: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600' as const,
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 24,
  },
  heading5: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 22,
  },
  heading6: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500' as const,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 22,
  },
  paragraph: {
    color: colors.text,
    fontSize: TYPOGRAPHY.BODY_FONT_SIZE,
    lineHeight: TYPOGRAPHY.BODY_LINE_HEIGHT,
    marginTop: 0,
    marginBottom: 12,
  },
  strong: {
    fontWeight: '700' as const,
  },
  em: {
    fontStyle: 'italic' as const,
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  list_item: {
    flexDirection: 'row' as const,
    marginBottom: 6,
  },
  bullet_list_icon: {
    color: colors.text,
    fontSize: TYPOGRAPHY.BODY_FONT_SIZE,
    lineHeight: TYPOGRAPHY.BODY_LINE_HEIGHT,
    marginRight: 8,
  },
  ordered_list_icon: {
    color: colors.text,
    fontSize: TYPOGRAPHY.BODY_FONT_SIZE,
    lineHeight: TYPOGRAPHY.BODY_LINE_HEIGHT,
    marginRight: 8,
  },
  blockquote: {
    backgroundColor: colors.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },
  hr: {
    backgroundColor: colors.cardBorder,
    height: 1,
    marginVertical: 16,
  },
});

/**
 * ニュースカードコンポーネント
 * 各ニュースのタイトル、要約、更新日時を表示
 *
 * アクセシビリティ対応:
 * - VoiceOver向けにaccessibilityLabelを設定
 * - カテゴリタイトルとニュースタイトルを読み上げ
 *
 * @see Requirements: 2.3, 6.4
 */
interface NewsCardExtendedProps extends NewsCardProps {
  /** テスト用ID（world/japan） */
  testId: string;
}

function NewsCard({ categoryTitle, news, testId }: NewsCardExtendedProps) {
  const colors = useThemeColors();

  // Markdownスタイルをメモ化（テーマ変更時のみ再生成）
  const markdownStyles = useMemo(() => createMarkdownStyles(colors), [colors]);

  // アクセシビリティ用のラベル生成
  // VoiceOverがカード全体の内容を読み上げるために使用
  const accessibilityLabel = `${categoryTitle}: ${news.title}。${formatDateTime(news.updatedAt)}更新`;

  return (
    <View
      testID={`news-card-${testId}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
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

      {/* 要約本文（Markdown形式） */}
      <View style={styles.summaryContainer}>
        <Markdown style={markdownStyles}>
          {news.summary}
        </Markdown>
      </View>
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
        accessible={true}
        accessibilityLabel={`エラー: ${message}`}
        accessibilityRole="alert"
      >
        <Text style={[styles.errorText, { color: colors.errorText }]}>
          {message}
        </Text>
        {retryable && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="再試行ボタン"
            accessibilityRole="button"
            accessibilityHint="タップしてニュースの取得を再試行します"
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
          <NewsCard categoryTitle="世界のニュース" news={worldNews} testId="world" />
        )}

        {/* 日本のニュース */}
        {japanNews && (
          <NewsCard categoryTitle="日本のニュース" news={japanNews} testId="japan" />
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
 * タイポグラフィ定数
 *
 * iOS Human Interface Guidelinesに基づく可読性の高いフォント設定
 * - 最小フォントサイズ: 16pt（Requirements: 6.4）
 * - 行間: フォントサイズの1.5倍以上（Requirements: 6.4）
 *
 * @see https://developer.apple.com/design/human-interface-guidelines/typography
 */
const TYPOGRAPHY = {
  /** 本文フォントサイズ（16pt以上を保証） */
  BODY_FONT_SIZE: 16,
  /** 本文行間（フォントサイズの1.625倍 = 26pt） */
  BODY_LINE_HEIGHT: 26,
  /** タイトルフォントサイズ（本文より大きく） */
  TITLE_FONT_SIZE: 18,
  /** タイトル行間 */
  TITLE_LINE_HEIGHT: 26,
  /** カテゴリフォントサイズ */
  CATEGORY_FONT_SIZE: 14,
  /** 更新日時フォントサイズ */
  META_FONT_SIZE: 12,
} as const;

/**
 * スペーシング定数
 *
 * カード間およびカード内の余白設定
 * @see Requirements: 6.4
 */
const SPACING = {
  /** カード内パディング */
  CARD_PADDING: 16,
  /** カード間の余白 */
  CARD_GAP: 16,
  /** スクロールビューのパディング */
  SCROLL_PADDING: 16,
} as const;

/**
 * スタイル定義
 *
 * フォントサイズと行間は可読性を確保するため、
 * iOS Human Interface Guidelinesに準拠した値を使用
 *
 * @see Requirements: 6.3, 6.4, 6.5
 */
const styles = StyleSheet.create({
  // コンテナ
  container: {
    flex: 1,
  },

  // スクロールビュー
  // 長文（約2000文字）の要約を快適に読めるようスクロール設定
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.SCROLL_PADDING,
    gap: SPACING.CARD_GAP,
  },

  // センター配置コンテナ（ローディング・エラー用）
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // カード
  // 適切な余白（16pt以上）でコンテンツを囲む
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: SPACING.CARD_PADDING,
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
    fontSize: TYPOGRAPHY.CATEGORY_FONT_SIZE,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ニュースタイトル
  // 本文より大きなフォントサイズで視覚的に区別
  newsTitle: {
    fontSize: TYPOGRAPHY.TITLE_FONT_SIZE,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: TYPOGRAPHY.TITLE_LINE_HEIGHT,
  },

  // 更新日時
  updatedAt: {
    fontSize: TYPOGRAPHY.META_FONT_SIZE,
    marginBottom: 12,
  },

  // 要約本文コンテナ（Markdown表示用）
  // Markdownコンポーネントを囲むコンテナ
  summaryContainer: {
    marginTop: 4,
  },

  // ローディング
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.CATEGORY_FONT_SIZE,
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
    fontSize: TYPOGRAPHY.BODY_FONT_SIZE,
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
    fontSize: TYPOGRAPHY.BODY_FONT_SIZE,
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
    fontSize: TYPOGRAPHY.BODY_FONT_SIZE,
    textAlign: 'center',
    lineHeight: 24,
  },
});
