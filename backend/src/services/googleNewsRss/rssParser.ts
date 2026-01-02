/**
 * RSSパーサー
 *
 * Task 7.1: RSSパーサーライブラリ導入
 * Task 7.3: RSSフィードパース機能
 * Requirements: 1.3 (Google News RSSから日本のニュース取得)
 *
 * rss-parserライブラリを使用してRSSフィードをパースする機能を提供
 *
 * @see https://www.npmjs.com/package/rss-parser - rss-parser npm package
 */

import Parser from 'rss-parser';
import type {
  RssParserConfig,
  GoogleNewsRssFeed,
  GoogleNewsRssItem,
} from './types';
import { DEFAULT_RSS_PARSER_CONFIG } from './types';

/**
 * rss-parserライブラリの出力型
 *
 * パースされたRSSアイテムの型定義
 */
interface ParsedItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  isoDate?: string;
  source?: { $: { url: string }; _: string } | string;
}

/**
 * rss-parserライブラリの出力型
 *
 * パースされたRSSフィード全体の型定義
 */
interface ParsedFeed {
  title?: string;
  description?: string;
  link?: string;
  lastBuildDate?: string;
  items: ParsedItem[];
}

/**
 * RSSパーサークラス
 *
 * rss-parserライブラリをラップし、Google News RSSフィードを
 * アプリケーション用の型に変換する機能を提供します。
 *
 * @example
 * const parser = new RssParser();
 * const feed = await parser.parseString(rssXmlString);
 * console.log(feed.items);
 */
export class RssParser {
  private readonly config: RssParserConfig;
  private readonly parser: Parser;

  /**
   * コンストラクタ
   *
   * @param config - パーサー設定（省略時はデフォルト値を使用）
   */
  constructor(config?: Partial<RssParserConfig>) {
    this.config = {
      ...DEFAULT_RSS_PARSER_CONFIG,
      ...config,
    };

    // rss-parserインスタンスを初期化
    // customFieldsでソース情報を取得可能にする
    this.parser = new Parser({
      customFields: {
        item: ['source'],
      },
    });
  }

  /**
   * 設定を取得
   *
   * @returns 現在の設定
   */
  getConfig(): RssParserConfig {
    return { ...this.config };
  }

  /**
   * RSS XML文字列をパースする
   *
   * @param xmlString - RSS形式のXML文字列
   * @returns パースされたフィードデータ
   * @throws XMLパースエラー時
   *
   * @example
   * const xml = '<rss version="2.0">...</rss>';
   * const feed = await parser.parseString(xml);
   */
  async parseString(xmlString: string): Promise<GoogleNewsRssFeed> {
    // rss-parserでパース
    const parsed = (await this.parser.parseString(xmlString)) as ParsedFeed;

    // アプリケーション用の型に変換
    return this.transformFeed(parsed);
  }

  /**
   * URLからRSSフィードを取得してパースする
   *
   * @param url - RSSフィードのURL
   * @returns パースされたフィードデータ
   * @throws ネットワークエラー、XMLパースエラー時
   *
   * @example
   * const url = 'https://news.google.com/rss/search?q=business&hl=ja&gl=JP&ceid=JP:ja';
   * const feed = await parser.parseURL(url);
   */
  async parseURL(url: string): Promise<GoogleNewsRssFeed> {
    // rss-parserでパース
    const parsed = (await this.parser.parseURL(url)) as ParsedFeed;

    // アプリケーション用の型に変換
    return this.transformFeed(parsed);
  }

  /**
   * パース結果をアプリケーション型に変換
   *
   * @param parsed - rss-parserの出力
   * @returns アプリケーション用のフィードデータ
   */
  private transformFeed(parsed: ParsedFeed): GoogleNewsRssFeed {
    // 記事数をmaxItemsで制限
    const limitedItems = parsed.items.slice(0, this.config.maxItems);

    return {
      title: parsed.title || '',
      description: parsed.description || null,
      link: parsed.link || '',
      lastBuildDate: parsed.lastBuildDate || null,
      items: limitedItems.map((item) => this.transformItem(item)),
    };
  }

  /**
   * 個別のアイテムを変換
   *
   * @param item - rss-parserのアイテム
   * @returns アプリケーション用のアイテムデータ
   */
  private transformItem(item: ParsedItem): GoogleNewsRssItem {
    // タイトルからソース名を抽出（Google News形式: 「記事タイトル - ソース名」）
    const rawTitle = item.title || '';
    const { articleTitle, source: titleSource } =
      this.extractSourceFromTitle(rawTitle);

    // ソース情報の取得（source要素があれば優先、なければタイトルから抽出）
    let source: string | null = null;
    if (item.source) {
      // source要素がオブジェクトの場合
      if (typeof item.source === 'object' && '_' in item.source) {
        source = item.source._;
      } else if (typeof item.source === 'string') {
        source = item.source;
      }
    }
    if (!source) {
      source = titleSource;
    }

    // 説明文のHTMLタグを除去
    const description = this.cleanDescription(
      item.contentSnippet || item.content || null
    );

    return {
      title: articleTitle,
      link: item.link || '',
      description,
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      source,
    };
  }

  /**
   * タイトルからソース名を抽出
   *
   * Google Newsでは「記事タイトル - ソース名」形式が一般的。
   * 最後のハイフンで分割してソース名を取得する。
   *
   * @param title - 元のタイトル
   * @returns 記事タイトルとソース名
   *
   * @example
   * const { articleTitle, source } = parser.extractSourceFromTitle('日経平均上昇 - 日本経済新聞');
   * // articleTitle: '日経平均上昇'
   * // source: '日本経済新聞'
   */
  extractSourceFromTitle(title: string): {
    articleTitle: string;
    source: string | null;
  } {
    // 最後の「 - 」で分割
    const lastDashIndex = title.lastIndexOf(' - ');

    if (lastDashIndex === -1) {
      return {
        articleTitle: title,
        source: null,
      };
    }

    return {
      articleTitle: title.substring(0, lastDashIndex).trim(),
      source: title.substring(lastDashIndex + 3).trim(),
    };
  }

  /**
   * 説明文からHTMLタグを除去
   *
   * @param description - HTML形式の説明文（nullの場合あり）
   * @returns プレーンテキストの説明文（空文字の場合はnull）
   *
   * @example
   * const clean = parser.cleanDescription('<p>テスト</p>');
   * // clean: 'テスト'
   */
  cleanDescription(description: string | null): string | null {
    if (!description) {
      return null;
    }

    // HTMLタグを除去
    const cleaned = description.replace(/<[^>]*>/g, '').trim();

    // 空文字の場合はnullを返す
    return cleaned || null;
  }
}
