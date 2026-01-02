/**
 * 世界ニュース取得機能
 *
 * Task 6.2: 世界ニュース取得機能
 * Task 6.3: NewsAPIレスポンスパース機能
 * Task 6.4: NewsAPI無料枠制御機能
 * Task 6.5: NewsAPIエラーハンドリング
 *
 * Requirements: 1.2 (businessカテゴリで世界のニュース記事取得)
 * Requirements: 10.2 (NewsAPIの無料枠100リクエスト/日内で運用)
 * Requirements: 8.5 (NewsAPI障害時のエラーハンドリング)
 *
 * @see https://newsapi.org/docs/endpoints/top-headlines - Top Headlines API
 */

import { NewsApiClient } from './newsApiClient';
import type {
  TopHeadlinesParams,
  TopHeadlinesResponse,
  NewsApiErrorResponse,
  RequestUsage,
} from './newsApiTypes';

/**
 * NewsAPI無料枠の1日あたりのリクエスト上限
 *
 * @see https://newsapi.org/pricing
 */
const DAILY_REQUEST_LIMIT = 100;

/**
 * 警告を出すリクエスト数の閾値（上限の90%）
 */
const WARNING_THRESHOLD_PERCENT = 90;

/**
 * NewsAPI共通エラー
 *
 * NewsAPIから返されるエラーを表すクラス
 */
export class NewsApiError extends Error {
  /**
   * HTTPステータスコード
   */
  public readonly statusCode: number;

  /**
   * NewsAPIエラーコード
   *
   * @see https://newsapi.org/docs/errors
   */
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'NewsApiError';
    this.statusCode = statusCode;
    this.code = code;
    // Errorクラスを正しく継承するための設定
    Object.setPrototypeOf(this, NewsApiError.prototype);
  }
}

/**
 * NewsAPIレート制限エラー
 *
 * 無料枠を超過した場合（429エラー）にスローされる
 */
export class NewsApiRateLimitError extends NewsApiError {
  constructor(message: string) {
    super(message, 429, 'rateLimited');
    this.name = 'NewsApiRateLimitError';
    Object.setPrototypeOf(this, NewsApiRateLimitError.prototype);
  }
}

/**
 * NewsAPIタイムアウトエラー
 *
 * リクエストがタイムアウトした場合にスローされる
 */
export class NewsApiTimeoutError extends NewsApiError {
  /**
   * タイムアウト時間（ミリ秒）
   */
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message, 0, 'timeout');
    this.name = 'NewsApiTimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, NewsApiTimeoutError.prototype);
  }
}

/**
 * 世界ニュース取得クラス
 *
 * NewsAPI Top Headlines APIを使用して世界のビジネスニュースを取得します。
 *
 * @example
 * const client = new NewsApiClient({ apiKey: 'your-key' });
 * const fetcher = new WorldNewsFetcher(client);
 * const news = await fetcher.fetchTopHeadlines({ category: 'business', country: 'us' });
 */
export class WorldNewsFetcher {
  private readonly client: NewsApiClient;
  private requestCount: number = 0;
  private lastRequestAt: string | null = null;
  private currentDate: string;

  /**
   * コンストラクタ
   *
   * @param client - NewsAPIクライアント
   */
  constructor(client: NewsApiClient) {
    this.client = client;
    // 日付をYYYY-MM-DD形式で保持
    this.currentDate = this.getTodayString();
  }

  /**
   * 今日の日付をYYYY-MM-DD形式で取得
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 日付が変わっていればカウントをリセット
   */
  private resetCounterIfNewDay(): void {
    const today = this.getTodayString();
    if (today !== this.currentDate) {
      this.requestCount = 0;
      this.currentDate = today;
    }
  }

  /**
   * Top Headlinesを取得
   *
   * businessカテゴリで世界のニュース記事を取得します。
   *
   * @param params - リクエストパラメータ
   * @returns ニュース記事のレスポンス
   * @throws {NewsApiError} API障害時
   * @throws {NewsApiRateLimitError} レート制限超過時
   * @throws {NewsApiTimeoutError} タイムアウト時
   *
   * @example
   * const response = await fetcher.fetchTopHeadlines({
   *   category: 'business',
   *   country: 'us',
   *   pageSize: 10
   * });
   */
  async fetchTopHeadlines(
    params: TopHeadlinesParams
  ): Promise<TopHeadlinesResponse> {
    // 日付が変わっていればカウントリセット
    this.resetCounterIfNewDay();

    // URLを構築
    const url = this.buildUrl(params);

    // HTTPリクエストオプション
    const options: RequestInit = {
      method: 'GET',
      headers: {
        'X-Api-Key': (this.client as unknown as { getApiKey(): string }).getApiKey(),
        'Content-Type': 'application/json',
      },
    };

    try {
      // リクエスト実行
      const response = await fetch(url, options);

      // リクエストカウントを更新
      this.requestCount++;
      this.lastRequestAt = new Date().toISOString();

      // レスポンスを解析
      const data = await response.json();

      // エラーレスポンスの処理
      if (!response.ok) {
        this.handleErrorResponse(response.status, data as NewsApiErrorResponse);
      }

      return data as TopHeadlinesResponse;
    } catch (error) {
      // 既にNewsApiErrorの場合はそのまま再スロー
      if (error instanceof NewsApiError) {
        throw error;
      }
      // ネットワークエラー・タイムアウトの処理
      this.handleFetchError(error);
      throw error; // 到達しないがTypeScript用
    }
  }

  /**
   * URLを構築する
   *
   * @param params - リクエストパラメータ
   * @returns 完全なURL
   */
  private buildUrl(params: TopHeadlinesParams): string {
    const baseUrl = this.client.getBaseUrl();
    const url = new URL(`${baseUrl}/top-headlines`);

    // パラメータを追加
    if (params.category) {
      url.searchParams.set('category', params.category);
    }
    if (params.country) {
      url.searchParams.set('country', params.country);
    }
    if (params.sources) {
      url.searchParams.set('sources', params.sources);
    }
    if (params.q) {
      url.searchParams.set('q', params.q);
    }
    if (params.pageSize !== undefined) {
      url.searchParams.set('pageSize', params.pageSize.toString());
    }
    if (params.page !== undefined) {
      url.searchParams.set('page', params.page.toString());
    }

    return url.toString();
  }

  /**
   * エラーレスポンスを処理する
   *
   * @param statusCode - HTTPステータスコード
   * @param errorResponse - エラーレスポンス
   * @throws {NewsApiRateLimitError} レート制限超過時
   * @throws {NewsApiError} その他のエラー時
   */
  private handleErrorResponse(
    statusCode: number,
    errorResponse: NewsApiErrorResponse
  ): never {
    // エラーログを出力
    console.error('[NewsAPI Error]', {
      statusCode,
      code: errorResponse.code,
      message: errorResponse.message,
    });

    // レート制限エラー
    if (statusCode === 429 || errorResponse.code === 'rateLimited') {
      throw new NewsApiRateLimitError(errorResponse.message);
    }

    // その他のエラー
    throw new NewsApiError(
      errorResponse.message,
      statusCode,
      errorResponse.code
    );
  }

  /**
   * fetchエラーを処理する
   *
   * @param error - 発生したエラー
   * @throws {NewsApiTimeoutError} タイムアウト時
   * @throws {NewsApiError} その他のネットワークエラー時
   */
  private handleFetchError(error: unknown): never {
    const config = this.client.getConfig();

    // エラーログを出力
    console.error('[NewsAPI Fetch Error]', error);

    // タイムアウトエラーの判定
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout') || message.includes('aborted')) {
        throw new NewsApiTimeoutError(
          `Request timed out after ${config.timeoutMs}ms`,
          config.timeoutMs
        );
      }
    }

    // その他のネットワークエラー
    const errorMessage =
      error instanceof Error ? error.message : 'Network error occurred';
    throw new NewsApiTimeoutError(errorMessage, config.timeoutMs);
  }

  /**
   * 1日あたりのリクエスト上限を取得
   *
   * @returns リクエスト上限数
   */
  getDailyRequestLimit(): number {
    return DAILY_REQUEST_LIMIT;
  }

  /**
   * リクエスト使用状況を取得
   *
   * @returns 使用状況
   */
  getRequestUsage(): RequestUsage {
    this.resetCounterIfNewDay();
    return {
      requestCount: this.requestCount,
      lastRequestAt: this.lastRequestAt,
      date: this.currentDate,
    };
  }

  /**
   * 日次上限に近いかどうかを判定
   *
   * 無料枠の90%を超えている場合にtrueを返す
   *
   * @returns 上限に近い場合true
   */
  isNearDailyLimit(): boolean {
    this.resetCounterIfNewDay();
    const threshold = (DAILY_REQUEST_LIMIT * WARNING_THRESHOLD_PERCENT) / 100;
    return this.requestCount >= threshold;
  }
}
