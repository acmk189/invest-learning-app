/**
 * 用語バッチAPIエンドポイント
 *
 * Task 11.1: 用語バッチAPIエンドポイント基盤
 *
 * Vercel Cron Jobsから毎日8:00 JSTに呼び出され、
 * 3つの投資用語を生成してFirestoreに保存する
 *
 * Requirements:
 * - 1.1 (毎日8:00に実行)
 * - 4.1 (1日3つ投資用語生成)
 * - 9.1 (CRON_SECRET環境変数による認証)
 *
 * @see https://vercel.com/docs/cron-jobs - Vercel Cron Jobs
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getClaudeClient } from '../../src/services/claudeClient';
import { TermGenerationService } from '../../src/services/terms/termGenerationService';
import { TermsBatchService, TermsBatchResult } from '../../src/services/terms/batch';

/**
 * APIレスポンス型
 */
interface BatchTermsResponse {
  success: boolean;
  message: string;
  data?: TermsBatchResult;
  timestamp: string;
  error?: string;
}

/**
 * CRON_SECRETを検証する
 *
 * Vercel Cron Jobsからのリクエストを認証する
 * CRON_SECRET環境変数が設定されている場合、
 * Authorizationヘッダーと一致するか検証する
 *
 * @param req - VercelRequest
 * @returns 認証成功の場合true
 */
function validateCronSecret(req: VercelRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRETが設定されていない場合はエラー
  if (!cronSecret) {
    console.error('[batch/terms] CRON_SECRET is not configured');
    return false;
  }

  // Authorizationヘッダーを取得
  const authHeader = req.headers.authorization;

  // Vercel Cron Jobsは "Bearer <secret>" 形式で送信する
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[batch/terms] Missing or invalid Authorization header');
    return false;
  }

  const token = authHeader.substring(7); // "Bearer " の後ろを取得
  return token === cronSecret;
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
  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  // CRON_SECRET認証
  if (!validateCronSecret(req)) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      timestamp: new Date().toISOString(),
    });
  }

  console.log('[batch/terms] Starting terms batch processing...');

  try {
    // 依存関係を初期化
    // Claude APIクライアント
    const claudeClient = getClaudeClient();
    const generationService = new TermGenerationService(claudeClient);

    // バッチサービスを作成
    const batchService = new TermsBatchService(generationService);

    // バッチ処理を実行
    const result = await batchService.execute();

    // 結果に応じてレスポンスを返す
    if (result.success) {
      console.log('[batch/terms] Batch processing completed successfully');
      return res.status(200).json({
        success: true,
        message: '用語バッチ処理が完了しました',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } else if (result.partialSuccess) {
      console.log('[batch/terms] Batch processing completed with partial success');
      return res.status(200).json({
        success: false,
        message: '用語バッチ処理が部分的に完了しました',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('[batch/terms] Batch processing failed');
      return res.status(500).json({
        success: false,
        message: '用語バッチ処理に失敗しました',
        data: result,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('[batch/terms] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: '用語バッチ処理中にエラーが発生しました',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
