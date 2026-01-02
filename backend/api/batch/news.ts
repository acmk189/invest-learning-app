/**
 * ニュースバッチAPIエンドポイント
 *
 * Task 8.1: ニュースバッチAPIエンドポイント基盤
 *
 * Vercel Cron Jobsから毎日8:00 JSTに呼び出され、
 * 世界・日本のニュースを取得・要約してFirestoreに保存する
 *
 * Requirements:
 * - 1.1 (毎日8:00に実行)
 * - 9.1 (CRON_SECRET環境変数による認証)
 *
 * @see https://vercel.com/docs/cron-jobs - Vercel Cron Jobs
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NewsApiClient } from '../../src/services/news/fetchers/newsApiClient';
import { WorldNewsFetcher } from '../../src/services/news/fetchers/worldNewsFetcher';
import { RssParser } from '../../src/services/news/fetchers/rssParser';
import { JapanNewsFetcher } from '../../src/services/news/fetchers/japanNewsFetcher';
import { getClaudeClient } from '../../src/services/claudeClient';
import { NewsSummaryService } from '../../src/services/news/summarization';
import { NewsBatchService, NewsBatchResult } from '../../src/services/news/batch';

/**
 * APIレスポンス型
 */
interface BatchNewsResponse {
  success: boolean;
  message: string;
  data?: NewsBatchResult;
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
    console.error('[batch/news] CRON_SECRET is not configured');
    return false;
  }

  // Authorizationヘッダーを取得
  const authHeader = req.headers.authorization;

  // Vercel Cron Jobsは "Bearer <secret>" 形式で送信する
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[batch/news] Missing or invalid Authorization header');
    return false;
  }

  const token = authHeader.substring(7); // "Bearer " の後ろを取得
  return token === cronSecret;
}

/**
 * POST /api/batch/news
 *
 * ニュースバッチ処理を実行
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET>
 *
 * @param req - Vercel Request
 * @param res - Vercel Response
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse<BatchNewsResponse>
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

  console.log('[batch/news] Starting news batch processing...');

  try {
    // 依存関係を初期化
    // NewsAPIクライアント
    const newsApiClient = new NewsApiClient();
    const worldNewsFetcher = new WorldNewsFetcher(newsApiClient);

    // Google News RSSクライアント
    const rssParser = new RssParser();
    const japanNewsFetcher = new JapanNewsFetcher(rssParser);

    // AI要約サービス
    const claudeClient = getClaudeClient();
    const summaryService = new NewsSummaryService(claudeClient);

    // バッチサービスを作成
    const batchService = new NewsBatchService(
      worldNewsFetcher,
      japanNewsFetcher,
      summaryService
    );

    // バッチ処理を実行
    const result = await batchService.execute();

    // 結果に応じてレスポンスを返す
    if (result.success) {
      console.log('[batch/news] Batch processing completed successfully');
      return res.status(200).json({
        success: true,
        message: 'ニュースバッチ処理が完了しました',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } else if (result.partialSuccess) {
      console.log('[batch/news] Batch processing completed with partial success');
      return res.status(200).json({
        success: false,
        message: 'ニュースバッチ処理が部分的に完了しました',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('[batch/news] Batch processing failed');
      return res.status(500).json({
        success: false,
        message: 'ニュースバッチ処理に失敗しました',
        data: result,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('[batch/news] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'ニュースバッチ処理中にエラーが発生しました',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
