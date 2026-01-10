/**
 * ユーザー向けエラーメッセージ定義
 * Task 2.2: エラーハンドリング共通機能実装
 */

import { ErrorType } from './types';

/**
 * ユーザー向けエラーメッセージマップ
 */
export const USER_ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: 'ネットワーク接続に問題が発生しました。インターネット接続を確認してください。',
  [ErrorType.API]: '外部サービスとの通信に失敗しました。しばらく待ってから再度お試しください。',
  [ErrorType.FIRESTORE]:
    'データの読み込みまたは保存に失敗しました。しばらく待ってから再度お試しください。',
  [ErrorType.VALIDATION]: '入力内容に誤りがあります。内容を確認してください。',
  [ErrorType.UNKNOWN]:
    '予期しないエラーが発生しました。問題が続く場合は、しばらく時間をおいてから再度お試しください。',
};

/**
 * 詳細なエラーメッセージマップ(開発者向け)
 */
export const DETAILED_ERROR_MESSAGES = {
  // ネットワークエラー
  NETWORK_TIMEOUT: 'ネットワークリクエストがタイムアウトしました',
  NETWORK_OFFLINE: 'オフライン状態です',
  NETWORK_CONNECTION_LOST: 'ネットワーク接続が切断されました',

  // APIエラー
  API_RATE_LIMIT: 'APIのレート制限に達しました',
  API_UNAUTHORIZED: 'API認証に失敗しました',
  API_INVALID_RESPONSE: 'APIからの応答が不正です',
  API_SERVICE_UNAVAILABLE: 'APIサービスが利用できません',

  // Firestoreエラー
  FIRESTORE_PERMISSION_DENIED: 'Firestoreへのアクセス権限がありません',
  FIRESTORE_NOT_FOUND: '要求されたデータが見つかりませんでした',
  FIRESTORE_WRITE_FAILED: 'Firestoreへの書き込みに失敗しました',
  FIRESTORE_READ_FAILED: 'Firestoreからの読み込みに失敗しました',

  // バッチ処理エラー
  BATCH_NEWS_FETCH_FAILED: 'ニュースの取得に失敗しました',
  BATCH_TERMS_GENERATION_FAILED: '用語の生成に失敗しました',
  BATCH_TIMEOUT: 'バッチ処理がタイムアウトしました',

  // AI処理エラー
  AI_SUMMARIZATION_FAILED: 'ニュースの要約に失敗しました',
  AI_TRANSLATION_FAILED: 'ニュースの翻訳に失敗しました',
  AI_TERM_GENERATION_FAILED: '用語の生成に失敗しました',
  AI_TOKEN_LIMIT_EXCEEDED: 'AIトークン数の上限に達しました',
} as const;

/**
 * エラーからユーザー向けメッセージを取得する
 * @param errorType - エラータイプ
 * @returns ユーザー向けエラーメッセージ
 */
export function getUserErrorMessage(errorType: ErrorType): string {
  return USER_ERROR_MESSAGES[errorType] || USER_ERROR_MESSAGES[ErrorType.UNKNOWN];
}

/**
 * エラーコードから詳細メッセージを取得する
 * @param errorCode - エラーコード
 * @returns 詳細エラーメッセージ
 */
export function getDetailedErrorMessage(
  errorCode: keyof typeof DETAILED_ERROR_MESSAGES
): string {
  return DETAILED_ERROR_MESSAGES[errorCode];
}
