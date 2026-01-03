/**
 * 日本経済ニュースRSS取得機能
 *
 * Task 7.2: 日本経済ニュースRSS取得機能
 * Task 7.4: RSS取得タイムアウト・エラーハンドリング
 * Requirements: 1.3 (Google News RSSから日本の投資・経済ニュース取得)
 * Requirements: 8.5 (RSS取得失敗時のエラーハンドリング)
 *
 * Google News RSSフィードから日本のビジネス・経済ニュースを取得します。
 *
 * @see https://news.google.com/rss/search?q=business&hl=ja&gl=JP&ceid=JP:ja - Google News RSS (Japan Business)
 */

import { RssParser } from './rssParser';
import type { GoogleNewsRssFeed } from './rssTypes';

/**
 * デフォルトのGoogle News RSS URL
 *
 * ビジネスカテゴリ、日本語、日本地域のニュースフィード
 */
const DEFAULT_FEED_URL =
  'https://news.google.com/rss/search?q=business&hl=ja&gl=JP&ceid=JP:ja';

/**
 * デフォルトのタイムアウト時間（ミリ秒）
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * デフォルトの最大取得記事数
 */
const DEFAULT_MAX_ITEMS = 10;

/**
 * 日本ニュース取得設定
 */
export interface JapanNewsFetcherConfig {
  /**
   * RSSフィードのURL
   *
   * @default Google News Japan Business RSS
   */
  feedUrl?: string;

  /**
   * タイムアウト時間（ミリ秒）
   *
   * @default 30000
   */
  timeoutMs?: number;

  /**
   * 最大取得記事数
   *
   * @default 10
   */
  maxItems?: number;
}

/**
 * RSS共通エラー
 *
 * RSSフィード取得・パース時の汎用エラー
 */
export class RssError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RssError';
    Object.setPrototypeOf(this, RssError.prototype);
  }
}

/**
 * RSSタイムアウトエラー
 *
 * RSS取得がタイムアウトした場合にスローされる
 */
export class RssTimeoutError extends RssError {
  /**
   * タイムアウト時間（ミリ秒）
   */
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = 'RssTimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, RssTimeoutError.prototype);
  }
}

/**
 * RSSネットワークエラー
 *
 * ネットワーク接続に問題がある場合にスローされる
 */
export class RssNetworkError extends RssError {
  constructor(message: string) {
    super(message);
    this.name = 'RssNetworkError';
    Object.setPrototypeOf(this, RssNetworkError.prototype);
  }
}

/**
 * 日本経済ニュースRSS取得クラス
 *
 * Google News RSSから日本のビジネス・経済ニュースを取得します。
 *
 * @example
 * const parser = new RssParser();
 * const fetcher = new JapanNewsFetcher(parser);
 * const news = await fetcher.fetchJapanNews();
 * console.log(news.items);
 */
export class JapanNewsFetcher {
  private readonly parser: RssParser;
  private readonly feedUrl: string;
  private readonly timeoutMs: number;
  private readonly maxItems: number;

  /**
   * コンストラクタ
   *
   * @param parser - RSSパーサーインスタンス
   * @param config - 取得設定（省略時はデフォルト値を使用）
   */
  constructor(parser: RssParser, config?: JapanNewsFetcherConfig) {
    this.parser = parser;
    this.feedUrl = config?.feedUrl || DEFAULT_FEED_URL;
    this.timeoutMs = config?.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.maxItems = config?.maxItems || DEFAULT_MAX_ITEMS;
  }

  /**
   * デフォルトのGoogle News RSSフィードURLを取得
   *
   * @returns デフォルトのフィードURL
   */
  static getDefaultFeedUrl(): string {
    return DEFAULT_FEED_URL;
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): {
    feedUrl: string;
    timeoutMs: number;
    maxItems: number;
  } {
    return {
      feedUrl: this.feedUrl,
      timeoutMs: this.timeoutMs,
      maxItems: this.maxItems,
    };
  }

  /**
   * 日本経済ニュースを取得
   *
   * Google News RSSから日本のビジネス・経済ニュースを取得します。
   * 設定されたmaxItemsに従って記事数を制限します。
   *
   * @returns 取得したニュースフィード
   * @throws {RssTimeoutError} タイムアウト時
   * @throws {RssNetworkError} ネットワークエラー時
   * @throws {RssError} パースエラーなどその他のエラー時
   *
   * @example
   * const news = await fetcher.fetchJapanNews();
   * for (const item of news.items) {
   *   console.log(item.title, item.source);
   * }
   */
  async fetchJapanNews(): Promise<GoogleNewsRssFeed> {
    try {
      // RSSフィードを取得してパース
      const feed = await this.parser.parseURL(this.feedUrl);

      // maxItemsに従って記事数を制限
      return {
        ...feed,
        items: feed.items.slice(0, this.maxItems),
      };
    } catch (error) {
      // エラーを分類して再スロー
      this.handleError(error);
      throw error; // 到達しないがTypeScript用
    }
  }

  /**
   * エラーを処理して適切なエラー型にラップする
   *
   * @param error - 発生したエラー
   * @throws {RssTimeoutError} タイムアウト時
   * @throws {RssNetworkError} ネットワークエラー時
   * @throws {RssError} その他のエラー時
   */
  private handleError(error: unknown): never {
    // エラーログを出力
    console.error('[Google News RSS Error]', error);

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const name = error.name.toLowerCase();

      // タイムアウトエラーの判定
      if (
        name === 'aborterror' ||
        message.includes('timeout') ||
        message.includes('aborted')
      ) {
        throw new RssTimeoutError(
          `RSS fetch timed out after ${this.timeoutMs}ms`,
          this.timeoutMs
        );
      }

      // ネットワークエラーの判定
      if (
        name === 'fetcherror' ||
        message.includes('network') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')
      ) {
        throw new RssNetworkError(`Network error: ${error.message}`);
      }

      // その他のエラー（パースエラー等）
      throw new RssError(`RSS error: ${error.message}`);
    }

    // 未知のエラー
    throw new RssError('Unknown RSS error occurred');
  }
}
