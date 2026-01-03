/**
 * ヘルスチェックAPIエンドポイント
 *
 * Requirements: 12.2, 12.3, 9.1, 9.2
 *
 * Firebase接続と環境変数の読み込みを検証するヘルスチェックエンドポイント。
 * Vercelデプロイ後の動作確認に使用します。
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../src/config/firebase';

/**
 * GET /api/health
 *
 * システムのヘルスチェックを実行
 *
 * @param req - Vercel Request
 * @param res - Vercel Response
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // 環境変数の確認
    const environment = {
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasNewsApiKey: !!process.env.NEWS_API_KEY,
      hasClaudeApiKey: !!process.env.CLAUDE_API_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
    };

    // すべての環境変数が設定されているか確認
    const allEnvVarsPresent = Object.values(environment).every(
      (value) => value === true
    );

    if (!allEnvVarsPresent) {
      return res.status(500).json({
        status: 'error',
        message: '環境変数が不足しています',
        environment,
        timestamp: new Date().toISOString(),
      });
    }

    // Firestore接続テスト
    let firestoreStatus: 'connected' | 'disconnected' = 'disconnected';
    try {
      const db = getFirestore();
      // 接続テスト用のコレクションに軽量なクエリを実行
      await db.collection('_health_check').limit(1).get();
      firestoreStatus = 'connected';
    } catch (firestoreError) {
      console.error('Firestore接続エラー:', firestoreError);
      return res.status(500).json({
        status: 'error',
        message: 'Firestore接続に失敗しました',
        firestore: 'disconnected',
        environment,
        timestamp: new Date().toISOString(),
        error:
          firestoreError instanceof Error
            ? firestoreError.message
            : 'Unknown error',
      });
    }

    // 成功レスポンス
    return res.status(200).json({
      status: 'ok',
      message: 'Health check passed',
      firestore: firestoreStatus,
      environment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('ヘルスチェックエラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'ヘルスチェックに失敗しました',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
