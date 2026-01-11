/**
 * ニュース部分成功検出・ハンドリング
 *
 * Task 9.3: ニュース部分成功検出・ハンドリング
 *
 * 世界ニュースまたは日本ニュースの一方のみ成功した場合の
 * 検出と適切なハンドリングを行う
 *
 * Requirements:
 * - 8.2 (98%以上バッチ成功率)
 *
 * @see https://supabase.com/docs/reference/javascript - Supabase参考
 */

import { NewsBatchResult } from './newsBatchService';

/**
 * 部分成功のタイプを定義するEnum
 *
 * バッチ処理の結果を4つのカテゴリに分類
 */
export enum PartialSuccessType {
  /** 完全成功(両方のニュースが取得・要約成功) */
  FULL_SUCCESS = 'full-success',
  /** 世界ニュースのみ成功 */
  WORLD_NEWS_ONLY = 'world-news-only',
  /** 日本ニュースのみ成功 */
  JAPAN_NEWS_ONLY = 'japan-news-only',
  /** 完全失敗(両方のニュースが失敗) */
  FULL_FAILURE = 'full-failure',
}

/**
 * ニュースの種類
 */
type NewsType = 'world' | 'japan';

/**
 * 部分成功の分析結果
 */
export interface PartialSuccessResult {
  /** 部分成功かどうか */
  isPartialSuccess: boolean;
  /** 成功タイプ */
  type: PartialSuccessType;
  /** 成功したニュースの種類 */
  successfulNews: NewsType[];
  /** 失敗したニュースの種類 */
  failedNews: NewsType[];
  /** 失敗の理由 */
  failureReasons: string[];
  /** 保存すべきかどうか */
  shouldSave: boolean;
  /** リトライすべきかどうか */
  shouldRetry: boolean;
}

/**
 * 通知の重要度
 */
type NotificationSeverity = 'info' | 'warning' | 'error';

/**
 * 部分成功時の通知情報
 */
export interface PartialSuccessNotification {
  /** 通知タイトル */
  title: string;
  /** 通知メッセージ */
  message: string;
  /** 重要度 */
  severity: NotificationSeverity;
  /** タイムスタンプ */
  timestamp: Date;
  /** 詳細情報 */
  details: {
    successfulNews: NewsType[];
    failedNews: NewsType[];
    failureReasons: string[];
  };
}

/**
 * 部分成功ハンドラー
 *
 * バッチ処理結果を分析し、部分成功の検出と適切なハンドリングを行う
 *
 * @example
 * const handler = new PartialSuccessHandler();
 * const result = handler.analyze(batchResult);
 *
 * if (result.isPartialSuccess) {
 *   // 部分成功時の処理
 *   if (result.shouldSave) {
 *     // 成功したニュースのみ保存
 *   }
 * }
 */
export class PartialSuccessHandler {
  /**
   * バッチ結果を分析
   *
   * バッチ処理の結果を分析し、成功状態を判定する
   *
   * @param batchResult - バッチ処理結果
   * @returns 分析結果
   */
  analyze(batchResult: NewsBatchResult): PartialSuccessResult {
    const hasWorldNews = !!batchResult.worldNews;
    const hasJapanNews = !!batchResult.japanNews;

    // 成功/失敗したニュースを特定
    const successfulNews: NewsType[] = [];
    const failedNews: NewsType[] = [];

    if (hasWorldNews) {
      successfulNews.push('world');
    } else {
      failedNews.push('world');
    }

    if (hasJapanNews) {
      successfulNews.push('japan');
    } else {
      failedNews.push('japan');
    }

    // 成功タイプを判定
    let type: PartialSuccessType;
    let isPartialSuccess: boolean;

    if (hasWorldNews && hasJapanNews) {
      type = PartialSuccessType.FULL_SUCCESS;
      isPartialSuccess = false;
    } else if (hasWorldNews && !hasJapanNews) {
      type = PartialSuccessType.WORLD_NEWS_ONLY;
      isPartialSuccess = true;
    } else if (!hasWorldNews && hasJapanNews) {
      type = PartialSuccessType.JAPAN_NEWS_ONLY;
      isPartialSuccess = true;
    } else {
      type = PartialSuccessType.FULL_FAILURE;
      isPartialSuccess = false;
    }

    // 失敗の理由を抽出
    const failureReasons = (batchResult.errors || []).map(
      (error) => error.message
    );

    // 保存判断: 少なくとも1つのニュースがあれば保存
    const shouldSave = hasWorldNews || hasJapanNews;

    // リトライ判断: 完全失敗の場合のみリトライ
    const shouldRetry = type === PartialSuccessType.FULL_FAILURE;

    return {
      isPartialSuccess,
      type,
      successfulNews,
      failedNews,
      failureReasons,
      shouldSave,
      shouldRetry,
    };
  }

  /**
   * 部分成功時の通知情報を生成
   *
   * @param analysisResult - 分析結果
   * @param date - 処理日付
   * @returns 通知情報
   */
  createNotification(
    analysisResult: PartialSuccessResult,
    date: string
  ): PartialSuccessNotification {
    const { type, successfulNews, failedNews, failureReasons } = analysisResult;

    let title: string;
    let message: string;
    let severity: NotificationSeverity;

    switch (type) {
      case PartialSuccessType.FULL_SUCCESS:
        title = `ニュースバッチ処理成功 (${date})`;
        message = '世界ニュースと日本ニュースの両方が正常に処理されました。';
        severity = 'info';
        break;

      case PartialSuccessType.WORLD_NEWS_ONLY:
        title = `ニュースバッチ処理部分成功 (${date})`;
        message = '世界ニュースのみ正常に処理されました。日本ニュースの取得に失敗しました。';
        severity = 'warning';
        break;

      case PartialSuccessType.JAPAN_NEWS_ONLY:
        title = `ニュースバッチ処理部分成功 (${date})`;
        message = '日本ニュースのみ正常に処理されました。世界ニュースの取得に失敗しました。';
        severity = 'warning';
        break;

      case PartialSuccessType.FULL_FAILURE:
        title = `ニュースバッチ処理失敗 (${date})`;
        message = '世界ニュースと日本ニュースの両方の処理に失敗しました。';
        severity = 'error';
        break;
    }

    return {
      title,
      message,
      severity,
      timestamp: new Date(),
      details: {
        successfulNews,
        failedNews,
        failureReasons,
      },
    };
  }

  /**
   * 部分成功のログを出力
   *
   * @param batchResult - バッチ処理結果
   */
  logPartialSuccess(batchResult: NewsBatchResult): void {
    const analysisResult = this.analyze(batchResult);

    if (analysisResult.isPartialSuccess) {
      console.warn(
        '[PartialSuccessHandler]',
        `Partial success detected: ${analysisResult.type}`
      );
      console.log(
        '[PartialSuccessHandler]',
        `Successful news: ${analysisResult.successfulNews.join(', ')}`
      );
      console.log(
        '[PartialSuccessHandler]',
        `Failed news: ${analysisResult.failedNews.join(', ')}`
      );

      if (analysisResult.failureReasons.length > 0) {
        console.log(
          '[PartialSuccessHandler]',
          `Failure reasons: ${analysisResult.failureReasons.join('; ')}`
        );
      }
    }
  }
}
