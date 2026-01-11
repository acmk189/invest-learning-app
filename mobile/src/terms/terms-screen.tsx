/**
 * Terms Screen コンポーネント
 * Task 23.1, 23.2, 23.3, 23.4: 用語画面UI実装
 *
 * MVVM パターンにおける View 層。
 * TermsViewModelResult を受け取り、用語を表示します。
 *
 * Requirements:
 * - 5.1: 用語タブで3つ表示
 * - 5.2: 用語名・解説文表示
 * - 7.5: エラー時リトライオプション提供
 * - 6.3: iOS各サイズ対応
 * - 6.4: 可読性確保
 *
 * @see design.md - Architecture - Terms Feature
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
import { TermItem, Difficulty } from '../supabase/types';
import { TermsViewModelResult } from './terms-viewmodel';

/**
 * TermsScreenのプロパティ
 * ViewModelの結果を受け取り、純粋なUIコンポーネントとして動作
 */
interface TermsScreenProps {
  /** ViewModelから提供される状態と関数 */
  viewModelResult: TermsViewModelResult;
}

/**
 * 難易度の日本語表示と色を返す関数
 * @param difficulty - 難易度
 * @returns 日本語表示と色
 */
const getDifficultyInfo = (
  difficulty: Difficulty
): { label: string; color: string } => {
  switch (difficulty) {
    case 'beginner':
      return { label: '初級', color: '#4CAF50' }; // 緑
    case 'intermediate':
      return { label: '中級', color: '#FF9800' }; // オレンジ
    case 'advanced':
      return { label: '上級', color: '#F44336' }; // 赤
    default:
      return { label: '不明', color: '#9E9E9E' };
  }
};

/**
 * 用語カードのプロパティ
 */
interface TermCardProps {
  /** 用語データ */
  term: TermItem;
  /** カードのインデックス */
  index: number;
}

/**
 * 用語カードコンポーネント
 * 用語名、解説文、難易度バッジを表示
 *
 * アクセシビリティ対応:
 * - VoiceOver向けにaccessibilityLabelを設定
 * - 用語名と難易度を読み上げ
 *
 * @see Requirements: 5.2, 6.4
 */
function TermCard({ term, index }: TermCardProps) {
  const colors = useThemeColors();
  const difficultyInfo = getDifficultyInfo(term.difficulty);

  // アクセシビリティ用のラベル生成
  // VoiceOverがカード全体の内容を読み上げるために使用
  const accessibilityLabel = `${term.name}、${difficultyInfo.label}レベル。${term.description}`;

  return (
    <View
      testID={`term-card-${index}`}
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
      {/* ヘッダー: 用語名と難易度バッジ */}
      <View style={styles.cardHeader}>
        {/* 用語名（太字で強調表示） */}
        <Text
          testID={`term-name-${index}`}
          style={[styles.termName, { color: colors.text }]}
          numberOfLines={2}
        >
          {term.name}
        </Text>

        {/* 難易度バッジ */}
        <View
          testID={`difficulty-badge-${index}`}
          style={[
            styles.difficultyBadge,
            { backgroundColor: difficultyInfo.color },
          ]}
        >
          <Text style={styles.difficultyText}>{difficultyInfo.label}</Text>
        </View>
      </View>

      {/* 解説文 */}
      <Text style={[styles.description, { color: colors.text }]}>
        {term.description}
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
        用語を読み込んでいます...
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
            accessibilityHint="タップして用語の取得を再試行します"
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
 * 用語画面コンポーネント
 *
 * ViewModelから提供される状態に基づいて、
 * ローディング、エラー、用語表示を切り替えます。
 *
 * @param props - TermsScreenProps
 * @returns 用語画面のReactコンポーネント
 */
export function TermsScreen({ viewModelResult }: TermsScreenProps) {
  const colors = useThemeColors();
  const { state, loading, terms, error, retry } = viewModelResult;

  // ローディング中
  if (loading) {
    return (
      <View
        testID="terms-container"
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
        testID="terms-container"
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

  // 成功状態: 用語表示
  return (
    <View
      testID="terms-container"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        testID="terms-scroll-view"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* 用語カードリスト */}
        {terms && terms.length > 0 ? (
          terms.map((term, index) => (
            <TermCard key={index} term={term} index={index} />
          ))
        ) : (
          // データがない場合のメッセージ
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              本日の用語はまだ配信されていません。
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
  /** 用語名フォントサイズ（本文より大きく） */
  TERM_NAME_FONT_SIZE: 18,
  /** 用語名行間 */
  TERM_NAME_LINE_HEIGHT: 26,
  /** 難易度バッジフォントサイズ */
  BADGE_FONT_SIZE: 12,
  /** ローディングテキストフォントサイズ */
  META_FONT_SIZE: 14,
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
  // 長文（約500文字）の解説を快適に読めるようスクロール設定
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

  // カードヘッダー（用語名と難易度バッジを横並び）
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  // 用語名（太字で強調表示）
  termName: {
    flex: 1,
    fontSize: TYPOGRAPHY.TERM_NAME_FONT_SIZE,
    fontWeight: '700', // 太字
    lineHeight: TYPOGRAPHY.TERM_NAME_LINE_HEIGHT,
    marginRight: 12,
  },

  // 難易度バッジ
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: TYPOGRAPHY.BADGE_FONT_SIZE,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // 解説文
  // 16pt以上のフォント、1.5倍以上の行間で可読性を確保
  description: {
    fontSize: TYPOGRAPHY.BODY_FONT_SIZE,
    lineHeight: TYPOGRAPHY.BODY_LINE_HEIGHT, // 行間1.625倍（可読性確保）
    textAlign: 'justify',
  },

  // ローディング
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.META_FONT_SIZE,
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
