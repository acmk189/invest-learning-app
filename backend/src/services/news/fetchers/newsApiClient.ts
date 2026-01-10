/**
 * NewsAPIクライアント導入と設定
 *
 * Task 6.1: NewsAPIクライアント導入と設定
 * Requirements: 1.2 (NewsAPIから世界のニュース取得)
 *
 * NewsAPI v2のAPIキーを環境変数から安全に読み込み、
 * HTTPSクライアントを初期化します。
 *
 * @see https://newsapi.org/docs/get-started - NewsAPI ドキュメント
 */

/**
 * NewsAPIのベースURL(HTTPS通信)
 * @see https://newsapi.org/docs/endpoints
 */
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

/**
 * デフォルトのタイムアウト時間(ミリ秒)
 */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * NewsAPI APIキー関連のエラー
 *
 * 環境変数未設定や不正なAPIキー形式を検出した際にスローされます。
 */
export class NewsApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NewsApiKeyError';
    // Errorクラスを正しく継承するための設定
    Object.setPrototypeOf(this, NewsApiKeyError.prototype);
  }
}

/**
 * 環境変数からNewsAPI APIキーを取得する
 *
 * NEWS_API_KEY環境変数から安全にAPIキーを読み込みます。
 * 未設定、空文字、空白のみの場合はエラーをスローします。
 *
 * @returns APIキー文字列
 * @throws {NewsApiKeyError} 環境変数が設定されていない場合
 *
 * @example
 * const apiKey = getNewsApiKey(); // "your-news-api-key"
 */
export function getNewsApiKey(): string {
  const apiKey = process.env.NEWS_API_KEY;

  // 未設定、空文字、空白のみをチェック
  if (!apiKey || apiKey.trim() === '') {
    throw new NewsApiKeyError('NEWS_API_KEY環境変数が設定されていません');
  }

  return apiKey;
}

/**
 * NewsAPI APIキーの形式を検証する
 *
 * APIキーが空でないことを確認します。
 *
 * @param apiKey - 検証対象のAPIキー
 * @returns 有効な形式の場合true、無効な場合false
 *
 * @example
 * validateNewsApiKey('valid-api-key'); // true
 * validateNewsApiKey(''); // false
 */
export function validateNewsApiKey(apiKey: string): boolean {
  if (!apiKey || apiKey.trim() === '') {
    return false;
  }
  return true;
}

/**
 * NewsAPIクライアントの設定オプション
 */
export interface NewsApiClientConfig {
  /**
   * NewsAPI APIキー
   * 未指定の場合は環境変数NEWS_API_KEYから読み込む
   */
  apiKey?: string;

  /**
   * リクエストタイムアウト時間(ミリ秒)
   * @default 10000
   */
  timeoutMs?: number;
}

/**
 * NewsAPIクライアントの設定情報(読み取り専用)
 *
 * APIキーは隠蔽して返します。
 */
export interface NewsApiClientInfo {
  /**
   * APIキーが設定されているかどうか
   */
  apiKeyConfigured: boolean;

  /**
   * タイムアウト時間(ミリ秒)
   */
  timeoutMs: number;
}

/**
 * NewsAPIクライアント
 *
 * NewsAPI v2エンドポイントへのHTTPSリクエストを行います。
 *
 * @example
 * // 環境変数からAPIキーを読み込んで初期化
 * const client = new NewsApiClient();
 *
 * @example
 * // APIキーを指定して初期化
 * const client = new NewsApiClient({ apiKey: 'your-api-key' });
 */
export class NewsApiClient {
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  /**
   * コンストラクタ
   *
   * @param config - クライアント設定
   * @throws {NewsApiKeyError} APIキーが設定されていない場合
   */
  constructor(config: NewsApiClientConfig = {}) {
    // APIキーを設定または環境変数から取得
    this.apiKey = config.apiKey ?? getNewsApiKey();

    // APIキーの検証
    if (!validateNewsApiKey(this.apiKey)) {
      throw new NewsApiKeyError('無効なAPIキーが指定されました');
    }

    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * NewsAPIのベースURLを取得
   *
   * @returns ベースURL(HTTPS)
   */
  getBaseUrl(): string {
    return NEWS_API_BASE_URL;
  }

  /**
   * クライアント設定情報を取得
   *
   * APIキーは隠蔽して返します。
   *
   * @returns 設定情報
   */
  getConfig(): NewsApiClientInfo {
    return {
      apiKeyConfigured: true,
      timeoutMs: this.timeoutMs,
    };
  }

  /**
   * APIキーを取得(内部使用)
   *
   * @returns APIキー
   */
  protected getApiKey(): string {
    return this.apiKey;
  }
}
