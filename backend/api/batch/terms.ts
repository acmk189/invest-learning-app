/**
 * 用語バッチAPIエンドポイント
 *
 * Task 11.1: 用語バッチAPIエンドポイント基盤
 * Task 13: Vercel Cron Jobs統合
 *
 * Vercel Cron Jobsから毎日8:00 JSTに呼び出され、
 * 3つの投資用語を生成してFirestoreに保存する
 *
 * Cronスケジュール: 0 23 * * * (UTC) = 8:00 JST
 *
 * Requirements:
 * - 1.1 (毎日8:00に実行)
 * - 4.1 (1日3つ投資用語生成)
 * - 9.1 (CRON_SECRET環境変数による認証)
 * - 1.8 (5分以内にバッチ完了)
 *
 * @see https://vercel.com/docs/cron-jobs - Vercel Cron Jobs
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getClaudeClient } from '../../src/services/claudeClient';
import { TermGenerationService } from '../../src/services/terms/termGenerationService';
import { TermsBatchService, TermsBatchResult } from '../../src/services/terms/batch';
import { validateCronSecret, CronLogger } from '../../src/services/cron';

/**
 * APIレスポンス型
 *
 * @property success - 処理成功フラグ
 * @property message - レスポンスメッセージ
 * @property data - バッチ処理結果（成功時）
 * @property timestamp - レスポンス生成時刻
 * @property error - エラーメッセージ（失敗時）
 * @property duration - 処理時間（ミリ秒）
 */
interface BatchTermsResponse {
  success: boolean;
  message: string;
  data?: TermsBatchResult;
  timestamp: string;
  error?: string;
  duration?: number;
}

/**
 * POST /api/batch/terms
 *
 * 用語バッチ処理を実行
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET>
 *
 * @param req - Vercel Request
 * @param res - Vercel Response
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse<BatchTermsResponse>
) {
  // Cronロガーを初期化（処理時間計測とログ出力）
  const logger = new CronLogger('terms-batch');

  // POSTメソッドのみ許可（GETはVercel Cron Jobsからの呼び出しでも使用可能）
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  // CRON_SECRET認証（共通モジュールを使用）
  const authResult = validateCronSecret(req);
  if (!authResult.isValid) {
    logger.log('error', `Authentication failed: ${authResult.error}`);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      timestamp: new Date().toISOString(),
      error: authResult.error,
    });
  }

  // 処理開始
  logger.start();

  try {
    // 依存関係を初期化
    // Claude APIクライアント
    const claudeClient = getClaudeClient();
    const generationService = new TermGenerationService(claudeClient);

    // バッチサービスを作成
    const batchService = new TermsBatchService(generationService);

    // タイムアウトチェック
    if (logger.checkTimeout()) {
      const summary = logger.end(new Error('Timeout before execution'));
      return res.status(500).json({
        success: false,
        message: 'タイムアウトが発生しました',
        timestamp: new Date().toISOString(),
        duration: summary.durationMs,
      });
    }

    // バッチ処理を実行
    const result = await batchService.execute();

    // 処理完了を記録
    const summary = logger.end();

    // 結果に応じてレスポンスを返す
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: '用語バッチ処理が完了しました',
        data: result,
        timestamp: new Date().toISOString(),
        duration: summary.durationMs,
      });
    } else if (result.partialSuccess) {
      return res.status(200).json({
        success: false,
        message: '用語バッチ処理が部分的に完了しました',
        data: result,
        timestamp: new Date().toISOString(),
        duration: summary.durationMs,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: '用語バッチ処理に失敗しました',
        data: result,
        timestamp: new Date().toISOString(),
        duration: summary.durationMs,
      });
    }
  } catch (error) {
    const summary = logger.end(error instanceof Error ? error : new Error('Unknown error'));
    return res.status(500).json({
      success: false,
      message: '用語バッチ処理中にエラーが発生しました',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: summary.durationMs,
    });
  }
}
