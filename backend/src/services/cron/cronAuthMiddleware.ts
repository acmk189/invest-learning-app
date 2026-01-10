/**
 * Cron認証ミドルウェア
 *
 * Task 13.2: CRON_SECRET認証機構
 *
 * Vercel Cron Jobsからのリクエストを認証するためのミドルウェア
 * CRON_SECRET環境変数を使用して不正アクセスを防止する
 *
 * Requirements:
 * - 9.1 (CRON_SECRET環境変数による認証)
 *
 * @see https://vercel.com/docs/cron-jobs#securing-cron-jobs
 */

import { VercelRequest } from '@vercel/node';
import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * CRON_SECRETのデフォルト長(バイト数)
 * 32バイト = 256ビット = 64文字(hex)
 */
export const CRON_SECRET_LENGTH = 32;

/**
 * 認証エラーコードの型定義
 */
export type CronAuthErrorCode =
  | 'MISSING_CONFIG' // CRON_SECRET環境変数が未設定
  | 'MISSING_HEADER' // Authorizationヘッダーがない
  | 'INVALID_FORMAT' // Bearerプレフィックスがない
  | 'INVALID_SECRET'; // シークレットが一致しない

/**
 * Cron認証結果の型定義
 *
 * @property isValid - 認証が成功した場合true
 * @property error - エラーメッセージ(認証失敗時)
 * @property errorCode - エラーコード(認証失敗時)
 */
export interface CronAuthResult {
  isValid: boolean;
  error?: string;
  errorCode?: CronAuthErrorCode;
}

/**
 * CRON_SECRETを検証する
 *
 * Vercel Cron Jobsからのリクエストを認証する
 * CRON_SECRET環境変数が設定されている場合、
 * Authorizationヘッダーと一致するか検証する
 *
 * Vercel Cron Jobsは以下の形式でリクエストを送信する:
 * - Authorization: Bearer <CRON_SECRET>
 *
 * @param req - VercelRequest
 * @returns CronAuthResult - 認証結果
 */
export function validateCronSecret(req: VercelRequest): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;

  // Step 1: CRON_SECRETが設定されているか確認
  if (!cronSecret) {
    console.error('[cron-auth] CRON_SECRET is not configured');
    return {
      isValid: false,
      error: 'CRON_SECRET is not configured',
      errorCode: 'MISSING_CONFIG',
    };
  }

  // Step 2: Authorizationヘッダーを取得
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.error('[cron-auth] Missing Authorization header');
    return {
      isValid: false,
      error: 'Missing Authorization header',
      errorCode: 'MISSING_HEADER',
    };
  }

  // Step 3: Bearer形式かチェック
  if (!authHeader.startsWith('Bearer ')) {
    console.error('[cron-auth] Invalid Authorization header format');
    return {
      isValid: false,
      error: 'Invalid Authorization header format',
      errorCode: 'INVALID_FORMAT',
    };
  }

  // Step 4: トークンを抽出して比較
  const token = authHeader.substring(7); // "Bearer " の後ろを取得

  // タイミング攻撃を防ぐため、固定時間で比較(crypto.timingSafeEqual使用)
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(cronSecret);

  // 長さが異なる場合、またはtimingSafeEqualで不一致の場合は認証失敗
  if (
    tokenBuffer.length !== secretBuffer.length ||
    !timingSafeEqual(tokenBuffer, secretBuffer)
  ) {
    console.error('[cron-auth] Invalid CRON_SECRET');
    return {
      isValid: false,
      error: 'Invalid CRON_SECRET',
      errorCode: 'INVALID_SECRET',
    };
  }

  return { isValid: true };
}

/**
 * 安全なCRON_SECRETを生成する
 *
 * 初回セットアップ時にCRON_SECRETを生成するためのユーティリティ関数
 * 生成された値はVercel環境変数に設定する
 *
 * @param length - シークレットの長さ(バイト数)。デフォルトは32バイト
 * @returns 生成されたシークレット(hex文字列)
 */
export function generateCronSecret(length: number = CRON_SECRET_LENGTH): string {
  return randomBytes(length).toString('hex');
}
