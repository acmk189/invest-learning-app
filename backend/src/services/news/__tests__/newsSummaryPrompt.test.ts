/**
 * ニュース要約プロンプトのテスト
 * Task 4.1, 4.2: ニュース要約プロンプト機能
 *
 * Requirements: 1.4, 1.5
 */

import {
  NewsArticle,
  buildEnglishNewsSummaryPrompt,
  buildJapaneseNewsSummaryPrompt,
  SUMMARY_CONFIG,
} from '../newsSummaryPrompt';

describe('ニュース要約プロンプト', () => {
  describe('NewsArticle型', () => {
    it('ニュース記事の基本構造を持つ', () => {
      const article: NewsArticle = {
        title: 'Test Title',
        description: 'Test description',
        content: 'Test content',
        source: 'Test Source',
        publishedAt: '2026-01-02T00:00:00Z',
      };

      expect(article.title).toBe('Test Title');
      expect(article.description).toBe('Test description');
      expect(article.content).toBe('Test content');
      expect(article.source).toBe('Test Source');
      expect(article.publishedAt).toBe('2026-01-02T00:00:00Z');
    });

    it('descriptionとcontentはオプショナル', () => {
      const article: NewsArticle = {
        title: 'Test Title',
        source: 'Test Source',
        publishedAt: '2026-01-02T00:00:00Z',
      };

      expect(article.description).toBeUndefined();
      expect(article.content).toBeUndefined();
    });
  });

  describe('SUMMARY_CONFIG', () => {
    it('目標文字数が2000文字である', () => {
      expect(SUMMARY_CONFIG.targetCharacters).toBe(2000);
    });

    it('最小・最大文字数が設定されている', () => {
      expect(SUMMARY_CONFIG.minCharacters).toBe(1800);
      expect(SUMMARY_CONFIG.maxCharacters).toBe(2200);
    });
  });

  describe('buildEnglishNewsSummaryPrompt', () => {
    const sampleArticles: NewsArticle[] = [
      {
        title: 'Stock Market Hits Record High',
        description: 'The stock market reached new highs today.',
        content:
          'Investors are optimistic about the economy as major indices close at record levels.',
        source: 'Financial Times',
        publishedAt: '2026-01-02T10:00:00Z',
      },
      {
        title: 'Fed Announces Interest Rate Decision',
        description: 'Federal Reserve maintains current rates.',
        content:
          'The Federal Reserve decided to keep interest rates unchanged amid economic uncertainty.',
        source: 'Reuters',
        publishedAt: '2026-01-02T11:00:00Z',
      },
    ];

    it('複数の英語ニュース記事からプロンプトを生成する', () => {
      const prompt = buildEnglishNewsSummaryPrompt(sampleArticles);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('プロンプトに日本語への翻訳指示が含まれる', () => {
      const prompt = buildEnglishNewsSummaryPrompt(sampleArticles);

      expect(prompt).toMatch(/日本語/);
      expect(prompt).toMatch(/翻訳/);
    });

    it('プロンプトに約2000文字の要約指示が含まれる', () => {
      const prompt = buildEnglishNewsSummaryPrompt(sampleArticles);

      expect(prompt).toMatch(/2000/);
      expect(prompt).toMatch(/文字/);
    });

    it('プロンプトにすべての記事のタイトルが含まれる', () => {
      const prompt = buildEnglishNewsSummaryPrompt(sampleArticles);

      expect(prompt).toContain('Stock Market Hits Record High');
      expect(prompt).toContain('Fed Announces Interest Rate Decision');
    });

    it('プロンプトに記事のソース（出典）が含まれる', () => {
      const prompt = buildEnglishNewsSummaryPrompt(sampleArticles);

      expect(prompt).toContain('Financial Times');
      expect(prompt).toContain('Reuters');
    });

    it('空の配列でも正常にプロンプトを生成する', () => {
      const prompt = buildEnglishNewsSummaryPrompt([]);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('descriptionやcontentがない記事も処理できる', () => {
      const minimalArticles: NewsArticle[] = [
        {
          title: 'Minimal Article',
          source: 'Test Source',
          publishedAt: '2026-01-02T00:00:00Z',
        },
      ];

      const prompt = buildEnglishNewsSummaryPrompt(minimalArticles);

      expect(prompt).toContain('Minimal Article');
    });

    it('投資・金融関連の要点抽出指示が含まれる', () => {
      const prompt = buildEnglishNewsSummaryPrompt(sampleArticles);

      // 投資・金融関連のキーワードが含まれているか
      expect(prompt).toMatch(/投資|金融|経済|市場/);
    });
  });

  describe('buildJapaneseNewsSummaryPrompt', () => {
    const sampleArticles: NewsArticle[] = [
      {
        title: '日経平均株価が上昇',
        description: '日経平均株価は前日比上昇で取引を終えた。',
        content: '東京証券取引所では、日経平均株価が上昇し、投資家の間で楽観論が広がっている。',
        source: '日本経済新聞',
        publishedAt: '2026-01-02T10:00:00Z',
      },
      {
        title: '日銀の金融政策決定会合',
        description: '日銀は金融政策の維持を決定。',
        content: '日本銀行は金融政策決定会合で現行の金融緩和策を維持することを決めた。',
        source: 'ロイター',
        publishedAt: '2026-01-02T11:00:00Z',
      },
    ];

    it('複数の日本語ニュース記事からプロンプトを生成する', () => {
      const prompt = buildJapaneseNewsSummaryPrompt(sampleArticles);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('プロンプトに約2000文字の要約指示が含まれる', () => {
      const prompt = buildJapaneseNewsSummaryPrompt(sampleArticles);

      expect(prompt).toMatch(/2000/);
      expect(prompt).toMatch(/文字/);
    });

    it('プロンプトにすべての記事のタイトルが含まれる', () => {
      const prompt = buildJapaneseNewsSummaryPrompt(sampleArticles);

      expect(prompt).toContain('日経平均株価が上昇');
      expect(prompt).toContain('日銀の金融政策決定会合');
    });

    it('プロンプトに記事のソース（出典）が含まれる', () => {
      const prompt = buildJapaneseNewsSummaryPrompt(sampleArticles);

      expect(prompt).toContain('日本経済新聞');
      expect(prompt).toContain('ロイター');
    });

    it('翻訳指示が含まれない（日本語記事のため）', () => {
      const prompt = buildJapaneseNewsSummaryPrompt(sampleArticles);

      // 日本語記事なので翻訳指示は不要
      expect(prompt).not.toMatch(/英語.*翻訳/);
    });

    it('空の配列でも正常にプロンプトを生成する', () => {
      const prompt = buildJapaneseNewsSummaryPrompt([]);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('投資・金融関連の要点抽出指示が含まれる', () => {
      const prompt = buildJapaneseNewsSummaryPrompt(sampleArticles);

      // 投資・金融関連のキーワードが含まれているか
      expect(prompt).toMatch(/投資|金融|経済|市場/);
    });
  });
});
