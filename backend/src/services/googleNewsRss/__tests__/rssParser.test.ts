/**
 * RSSパーサーテスト
 *
 * Task 7.1: RSSパーサーライブラリ導入
 * Task 7.3: RSSフィードパース機能
 * Requirements: 1.3 (Google News RSSから日本のニュース取得)
 */

import { RssParser } from '../rssParser';
import type { RssParserConfig, GoogleNewsRssFeed } from '../types';

describe('RssParser', () => {
  let parser: RssParser;

  beforeEach(() => {
    parser = new RssParser();
    jest.clearAllMocks();
  });

  describe('初期化', () => {
    it('デフォルト設定で初期化できる', () => {
      const defaultParser = new RssParser();
      const config = defaultParser.getConfig();

      expect(config.timeoutMs).toBe(30000);
      expect(config.maxItems).toBe(10);
    });

    it('カスタム設定で初期化できる', () => {
      const customConfig: RssParserConfig = {
        timeoutMs: 15000,
        maxItems: 5,
      };
      const customParser = new RssParser(customConfig);
      const config = customParser.getConfig();

      expect(config.timeoutMs).toBe(15000);
      expect(config.maxItems).toBe(5);
    });
  });

  describe('parseString', () => {
    it('有効なRSS XMLを正しくパースできる', async () => {
      const mockRssXml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Google News - ビジネス</title>
            <description>Google News - 日本のビジネスニュース</description>
            <link>https://news.google.com</link>
            <lastBuildDate>Thu, 02 Jan 2026 08:00:00 GMT</lastBuildDate>
            <item>
              <title>テスト記事1 - ソース名</title>
              <link>https://example.com/article1</link>
              <description>記事1の説明文</description>
              <pubDate>Thu, 02 Jan 2026 07:00:00 GMT</pubDate>
              <source>Example News</source>
            </item>
            <item>
              <title>テスト記事2 - 別のソース</title>
              <link>https://example.com/article2</link>
              <description>記事2の説明文</description>
              <pubDate>Thu, 02 Jan 2026 06:00:00 GMT</pubDate>
              <source>Another News</source>
            </item>
          </channel>
        </rss>`;

      const result = await parser.parseString(mockRssXml);

      expect(result).toBeDefined();
      expect(result.title).toBe('Google News - ビジネス');
      expect(result.description).toBe('Google News - 日本のビジネスニュース');
      expect(result.link).toBe('https://news.google.com');
      expect(result.items).toHaveLength(2);
      // タイトルからソース名が分離され、source要素があればそちらを優先
      expect(result.items[0].title).toBe('テスト記事1');
      expect(result.items[0].source).toBe('Example News');
      expect(result.items[0].link).toBe('https://example.com/article1');
      expect(result.items[0].description).toBe('記事1の説明文');
    });

    it('maxItems設定に従って記事数を制限する', async () => {
      const limitedParser = new RssParser({ timeoutMs: 30000, maxItems: 1 });

      const mockRssXml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <link>https://example.com</link>
            <item>
              <title>記事1</title>
              <link>https://example.com/1</link>
              <pubDate>Thu, 02 Jan 2026 08:00:00 GMT</pubDate>
            </item>
            <item>
              <title>記事2</title>
              <link>https://example.com/2</link>
              <pubDate>Thu, 02 Jan 2026 07:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`;

      const result = await limitedParser.parseString(mockRssXml);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('記事1');
    });

    it('不正なXMLでエラーをスローする', async () => {
      const invalidXml = 'not valid xml';

      await expect(parser.parseString(invalidXml)).rejects.toThrow();
    });
  });

  describe('extractSourceFromTitle', () => {
    it('タイトルからソース名を抽出できる', () => {
      // Google Newsは「記事タイトル - ソース名」形式
      const title = '日経平均が上昇 - 日本経済新聞';
      const { articleTitle, source } = parser.extractSourceFromTitle(title);

      expect(articleTitle).toBe('日経平均が上昇');
      expect(source).toBe('日本経済新聞');
    });

    it('ハイフンがないタイトルはそのまま返す', () => {
      const title = 'ハイフンのないタイトル';
      const { articleTitle, source } = parser.extractSourceFromTitle(title);

      expect(articleTitle).toBe('ハイフンのないタイトル');
      expect(source).toBeNull();
    });

    it('複数のハイフンがある場合は最後のハイフンで分割', () => {
      const title = 'A社 - B社の合併 - Bloomberg';
      const { articleTitle, source } = parser.extractSourceFromTitle(title);

      expect(articleTitle).toBe('A社 - B社の合併');
      expect(source).toBe('Bloomberg');
    });
  });

  describe('cleanDescription', () => {
    it('HTMLタグを除去できる', () => {
      const html = '<p>これは<strong>テスト</strong>です</p>';
      const cleaned = parser.cleanDescription(html);

      expect(cleaned).toBe('これはテストです');
    });

    it('nullの場合はnullを返す', () => {
      const cleaned = parser.cleanDescription(null);

      expect(cleaned).toBeNull();
    });

    it('空文字の場合はnullを返す', () => {
      const cleaned = parser.cleanDescription('');

      expect(cleaned).toBeNull();
    });
  });
});
