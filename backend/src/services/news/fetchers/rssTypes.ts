/**
 * Google News RSS型定義
 *
 * Task 7.3: RSSフィードパース機能
 * Requirements: 1.3 (Google News RSSから日本の投資・経済ニュース取得)
 *
 * Google News RSSフィードのレスポンス型定義
 *
 * @see https://news.google.com/rss/search?q=business&hl=ja&gl=JP&ceid=JP:ja - Google News RSS
 */

/**
 * RSSフィードのアイテム(1つの記事)
 *
 * Google News RSSから取得される記事情報
 */
export interface GoogleNewsRssItem {
  /**
   * 記事タイトル
   */
  title: string;

  /**
   * 記事へのリンクURL
   */
  link: string;

  /**
   * 記事の説明・概要(HTML形式の場合あり)
   */
  description: string | null;

  /**
   * 記事の公開日時(ISO 8601形式)
   */
  publishedAt: string;

  /**
   * ソース名(元の配信元)
   */
  source: string | null;
}

/**
 * RSSフィード取得結果
 *
 * Google News RSSから取得したフィード全体
 */
export interface GoogleNewsRssFeed {
  /**
   * フィードのタイトル
   */
  title: string;

  /**
   * フィードの説明
   */
  description: string | null;

  /**
   * フィードへのリンク
   */
  link: string;

  /**
   * 最終更新日時
   */
  lastBuildDate: string | null;

  /**
   * 記事の配列
   */
  items: GoogleNewsRssItem[];
}

/**
 * RSSパーサー設定
 *
 * rss-parserライブラリのカスタム設定
 */
export interface RssParserConfig {
  /**
   * リクエストタイムアウト(ミリ秒)
   *
   * @default 30000 (30秒)
   */
  timeoutMs: number;

  /**
   * 取得する最大記事数
   *
   * @default 10
   */
  maxItems: number;
}

/**
 * RSSパーサー設定のデフォルト値
 */
export const DEFAULT_RSS_PARSER_CONFIG: RssParserConfig = {
  timeoutMs: 30000,
  maxItems: 10,
};
