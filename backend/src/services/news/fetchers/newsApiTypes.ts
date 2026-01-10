/**
 * NewsAPI型定義
 *
 * Task 6.3: NewsAPIレスポンスパース機能
 * Requirements: 1.2 (NewsAPIから世界のニュース取得)
 *
 * NewsAPI v2のリクエスト・レスポンスの型定義
 *
 * @see https://newsapi.org/docs/endpoints/top-headlines - Top Headlines API
 */

/**
 * ニュースソース情報
 *
 * 記事の配信元を表す情報
 */
export interface NewsApiSource {
  /**
   * ソースID(nullの場合もある)
   */
  id: string | null;

  /**
   * ソース名
   */
  name: string;
}

/**
 * ニュース記事
 *
 * NewsAPIから取得される1つの記事情報
 *
 * @see https://newsapi.org/docs/endpoints/top-headlines
 */
export interface NewsApiArticle {
  /**
   * 記事のソース情報
   */
  source: NewsApiSource;

  /**
   * 著者名(不明な場合はnull)
   */
  author: string | null;

  /**
   * 記事タイトル
   */
  title: string;

  /**
   * 記事の説明・概要(不明な場合はnull)
   */
  description: string | null;

  /**
   * 記事のURL
   */
  url: string;

  /**
   * 記事のサムネイル画像URL(不明な場合はnull)
   */
  urlToImage: string | null;

  /**
   * 記事の公開日時(ISO 8601形式)
   */
  publishedAt: string;

  /**
   * 記事本文(切り詰められている場合あり、nullの場合もある)
   */
  content: string | null;
}

/**
 * Top Headlines APIのリクエストパラメータ
 *
 * @see https://newsapi.org/docs/endpoints/top-headlines
 */
export interface TopHeadlinesParams {
  /**
   * ニュースカテゴリ
   *
   * business, entertainment, general, health, science, sports, technology
   */
  category?: 'business' | 'entertainment' | 'general' | 'health' | 'science' | 'sports' | 'technology';

  /**
   * 国コード(ISO 3166-1 alpha-2)
   *
   * 例: us, jp, gb
   *
   * Note: sourcesパラメータと同時に使用不可
   */
  country?: string;

  /**
   * ソースID(カンマ区切りで複数指定可能)
   *
   * Note: countryやcategoryパラメータと同時に使用不可
   */
  sources?: string;

  /**
   * 検索キーワード
   */
  q?: string;

  /**
   * 1ページあたりの結果数
   *
   * @default 20
   * @max 100
   */
  pageSize?: number;

  /**
   * ページ番号
   */
  page?: number;
}

/**
 * Top Headlines APIのレスポンス
 *
 * @see https://newsapi.org/docs/endpoints/top-headlines
 */
export interface TopHeadlinesResponse {
  /**
   * ステータス(ok または error)
   */
  status: 'ok' | 'error';

  /**
   * 検索結果の総数
   */
  totalResults: number;

  /**
   * 記事の配列
   */
  articles: NewsApiArticle[];
}

/**
 * NewsAPIエラーレスポンス
 *
 * @see https://newsapi.org/docs/errors
 */
export interface NewsApiErrorResponse {
  /**
   * ステータス(error)
   */
  status: 'error';

  /**
   * エラーコード
   *
   * apiKeyDisabled, apiKeyExhausted, apiKeyInvalid, apiKeyMissing,
   * parametersIncompatible, parametersMissing, rateLimited,
   * sourcesTooMany, sourceDoesNotExist, unexpectedError
   */
  code: string;

  /**
   * エラーメッセージ
   */
  message: string;
}

/**
 * リクエスト使用状況
 */
export interface RequestUsage {
  /**
   * 本日のリクエスト回数
   */
  requestCount: number;

  /**
   * 最後のリクエスト日時(ISO 8601形式)
   */
  lastRequestAt: string | null;

  /**
   * 日付(YYYY-MM-DD形式)
   */
  date: string;
}
