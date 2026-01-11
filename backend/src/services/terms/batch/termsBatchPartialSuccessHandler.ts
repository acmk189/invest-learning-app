/**
 * 用語部分成功検出・ハンドリング
 *
 * Task 12.3: 用語部分成功検出・ハンドリング
 *
 * 2つの用語のみ生成成功、または1つの用語のみ生成成功の場合の
 * 検出と適切なハンドリングを行う
 *
 * Requirements:
 * - 8.2 (98%以上バッチ成功率)
 *
 * @see https://supabase.com/docs/reference/javascript - Supabase参考
 */

import { TermsBatchResult } from './termsBatchService';
import { TermDifficulty } from '../../../models/terms.model';

/**
 * 部分成功のタイプを定義するEnum
 *
 * バッチ処理の結果を4つのカテゴリに分類
 */
export enum TermsPartialSuccessType {
  /** 完全成功(3つの用語が生成成功) */
  FULL_SUCCESS = 'full-success',
  /** 2つの用語が生成成功 */
  TWO_TERMS = 'two-terms',
  /** 1つの用語が生成成功 */
  ONE_TERM = 'one-term',
  /** 完全失敗(用語が生成されなかった) */
  FULL_FAILURE = 'full-failure',
}

/**
 * 期待される用語数
 */
const EXPECTED_TERM_COUNT = 3;

/**
 * 期待される難易度の配列
 */
const EXPECTED_DIFFICULTIES: TermDifficulty[] = ['beginner', 'intermediate', 'advanced'];

/**
 * 部分成功の分析結果
 */
export interface TermsPartialSuccessResult {
  /** 部分成功かどうか */
  isPartialSuccess: boolean;
  /** 成功タイプ */
  type: TermsPartialSuccessType;
  /** 生成された用語数 */
  generatedCount: number;
  /** 生成されなかった用語数 */
  missingCount: number;
  /** 生成された難易度のリスト */
  generatedDifficulties: TermDifficulty[];
  /** 生成されなかった難易度のリスト */
  missingDifficulties: TermDifficulty[];
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
export interface TermsPartialSuccessNotification {
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
    generatedCount: number;
    missingCount: number;
    generatedDifficulties: TermDifficulty[];
    missingDifficulties: TermDifficulty[];
    failureReasons: string[];
  };
}

/**
 * 用語部分成功ハンドラー
 *
 * バッチ処理結果を分析し、部分成功の検出と適切なハンドリングを行う
 *
 * @example
 * const handler = new TermsPartialSuccessHandler();
 * const result = handler.analyze(batchResult);
 *
 * if (result.isPartialSuccess) {
 *   // 部分成功時の処理
 *   if (result.shouldSave) {
 *     // 成功した用語のみ保存
 *   }
 * }
 */
export class TermsPartialSuccessHandler {
  /**
   * バッチ結果を分析
   *
   * バッチ処理の結果を分析し、成功状態を判定する
   *
   * @param batchResult - バッチ処理結果
   * @returns 分析結果
   */
  analyze(batchResult: TermsBatchResult): TermsPartialSuccessResult {
    const terms = batchResult.terms || [];
    const generatedCount = terms.length;
    const missingCount = EXPECTED_TERM_COUNT - generatedCount;

    // 生成された難易度を取得
    const generatedDifficulties = terms.map((term) => term.difficulty);

    // 生成されなかった難易度を特定
    const missingDifficulties = EXPECTED_DIFFICULTIES.filter(
      (difficulty) => !generatedDifficulties.includes(difficulty)
    );

    // 成功タイプを判定
    let type: TermsPartialSuccessType;
    let isPartialSuccess: boolean;

    switch (generatedCount) {
      case 3:
        type = TermsPartialSuccessType.FULL_SUCCESS;
        isPartialSuccess = false;
        break;
      case 2:
        type = TermsPartialSuccessType.TWO_TERMS;
        isPartialSuccess = true;
        break;
      case 1:
        type = TermsPartialSuccessType.ONE_TERM;
        isPartialSuccess = true;
        break;
      default:
        type = TermsPartialSuccessType.FULL_FAILURE;
        isPartialSuccess = false;
        break;
    }

    // 失敗の理由を抽出
    const failureReasons = (batchResult.errors || []).map(
      (error) => error.message
    );

    // 保存判断: 少なくとも1つの用語があれば保存
    const shouldSave = generatedCount > 0;

    // リトライ判断: 完全失敗の場合のみリトライ
    const shouldRetry = type === TermsPartialSuccessType.FULL_FAILURE;

    return {
      isPartialSuccess,
      type,
      generatedCount,
      missingCount,
      generatedDifficulties,
      missingDifficulties,
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
    analysisResult: TermsPartialSuccessResult,
    date: string
  ): TermsPartialSuccessNotification {
    const {
      type,
      generatedCount,
      missingCount,
      generatedDifficulties,
      missingDifficulties,
      failureReasons,
    } = analysisResult;

    let title: string;
    let message: string;
    let severity: NotificationSeverity;

    switch (type) {
      case TermsPartialSuccessType.FULL_SUCCESS:
        title = `用語バッチ処理成功 (${date})`;
        message = '3つの投資用語(初級・中級・上級)が正常に生成されました。';
        severity = 'info';
        break;

      case TermsPartialSuccessType.TWO_TERMS:
        title = `用語バッチ処理部分成功 (${date})`;
        message = `2つの用語のみ生成されました。${this.formatMissingDifficulties(missingDifficulties)}用語の生成に失敗しました。`;
        severity = 'warning';
        break;

      case TermsPartialSuccessType.ONE_TERM:
        title = `用語バッチ処理部分成功 (${date})`;
        message = `1つの用語のみ生成されました。${this.formatMissingDifficulties(missingDifficulties)}用語の生成に失敗しました。`;
        severity = 'warning';
        break;

      case TermsPartialSuccessType.FULL_FAILURE:
        title = `用語バッチ処理失敗 (${date})`;
        message = 'すべての用語の生成に失敗しました。';
        severity = 'error';
        break;
    }

    return {
      title,
      message,
      severity,
      timestamp: new Date(),
      details: {
        generatedCount,
        missingCount,
        generatedDifficulties,
        missingDifficulties,
        failureReasons,
      },
    };
  }

  /**
   * 部分成功のログを出力
   *
   * @param batchResult - バッチ処理結果
   */
  logPartialSuccess(batchResult: TermsBatchResult): void {
    const analysisResult = this.analyze(batchResult);

    if (analysisResult.isPartialSuccess) {
      console.warn(
        '[TermsPartialSuccessHandler]',
        `Partial success detected: ${analysisResult.type}`
      );
      console.log(
        '[TermsPartialSuccessHandler]',
        `Generated terms: ${analysisResult.generatedCount}/3 (${analysisResult.generatedDifficulties.join(', ')})`
      );
      console.log(
        '[TermsPartialSuccessHandler]',
        `Missing difficulties: ${analysisResult.missingDifficulties.join(', ')}`
      );

      if (analysisResult.failureReasons.length > 0) {
        console.log(
          '[TermsPartialSuccessHandler]',
          `Failure reasons: ${analysisResult.failureReasons.join('; ')}`
        );
      }
    }
  }

  /**
   * 欠けている難易度を日本語でフォーマット
   *
   * @param difficulties - 難易度の配列
   * @returns フォーマットされた文字列
   */
  private formatMissingDifficulties(difficulties: TermDifficulty[]): string {
    const difficultyMap: Record<TermDifficulty, string> = {
      beginner: '初級',
      intermediate: '中級',
      advanced: '上級',
    };

    return difficulties.map((d) => difficultyMap[d]).join('・');
  }
}
