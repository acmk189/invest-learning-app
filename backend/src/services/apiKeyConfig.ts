/**
 * APIキー環境変数読み込みとHTTPS接続設定
 *
 * Requirements: 9.1, 9.3, 9.4
 *
 * このモジュールは、Claude API(Anthropic)のAPIキーを環境変数から安全に読み込み、
 * HTTPS通信設定を管理します。
 *
 * @see https://docs.anthropic.com/en/api/getting-started - Anthropic API ドキュメント
 */

/**
 * Anthropic APIのベースURL(HTTPS通信)
 *
 * Anthropic SDKはデフォルトでこのURLを使用してHTTPS通信を行います。
 * TLS 1.2以上で暗号化された通信を保証します。
 *
 * @see https://docs.anthropic.com/en/api/getting-started#accessing-the-api
 */
const ANTHROPIC_API_BASE_URL = 'https://api.anthropic.com';

/**
 * APIキー関連のエラーを表すカスタムエラークラス
 *
 * 環境変数未設定や不正なAPIキー形式を検出した際にスローされます。
 */
export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
    // Errorクラスを正しく継承するための設定
    Object.setPrototypeOf(this, ApiKeyError.prototype);
  }
}

/**
 * 環境変数からAPIキーを取得する
 *
 * CLAUDE_API_KEY環境変数から安全にAPIキーを読み込みます。
 * 未設定、空文字、空白のみの場合はエラーをスローします。
 *
 * @returns APIキー文字列
 * @throws {ApiKeyError} 環境変数が設定されていない場合
 *
 * @example
 * // 環境変数が設定されている場合
 * const apiKey = getApiKey(); // "sk-ant-api03-..."
 *
 * @example
 * // 環境変数が未設定の場合
 * getApiKey(); // throws ApiKeyError
 */
export function getApiKey(): string {
  const apiKey = process.env.CLAUDE_API_KEY;

  // 未設定、空文字、空白のみをチェック
  if (!apiKey || apiKey.trim() === '') {
    throw new ApiKeyError('CLAUDE_API_KEY環境変数が設定されていません');
  }

  return apiKey;
}

/**
 * APIキーの形式を検証する
 *
 * APIキーが空でないことを確認します。
 * より厳密な形式チェックは行わず、基本的な存在確認のみを行います。
 *
 * @param apiKey - 検証対象のAPIキー
 * @returns 有効な形式の場合true、無効な場合false
 *
 * @example
 * validateApiKey('sk-ant-api03-valid-key'); // true
 * validateApiKey(''); // false
 * validateApiKey('   '); // false
 */
export function validateApiKey(apiKey: string): boolean {
  // 空文字または空白のみの場合は無効
  if (!apiKey || apiKey.trim() === '') {
    return false;
  }

  return true;
}

/**
 * Anthropic APIのベースURLを取得する
 *
 * HTTPS通信を保証するため、固定のベースURLを返します。
 * Anthropic SDKはこのURLを使用してセキュアな通信を行います。
 *
 * @returns Anthropic APIのベースURL(HTTPS)
 *
 * @example
 * const baseUrl = getApiBaseUrl(); // "https://api.anthropic.com"
 */
export function getApiBaseUrl(): string {
  return ANTHROPIC_API_BASE_URL;
}

/**
 * HTTPS通信が有効かどうかを確認する
 *
 * Anthropic APIはHTTPS通信のみをサポートしており、
 * TLS 1.2以上で暗号化された通信が保証されています。
 *
 * @returns HTTPS通信が有効な場合true
 *
 * @example
 * if (isHttpsEnabled()) {
 *   // セキュアな通信が可能
 * }
 */
export function isHttpsEnabled(): boolean {
  // Anthropic APIはHTTPS通信のみをサポート
  // ベースURLがhttps://で始まることで保証
  return ANTHROPIC_API_BASE_URL.startsWith('https://');
}
