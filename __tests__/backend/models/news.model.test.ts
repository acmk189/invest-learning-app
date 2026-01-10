/**
 * News Data Model Tests
 *
 * Requirements Coverage:
 * - Requirement 3.3: Firestore 1MB以下ドキュメント
 * - Requirement 1.6: 処理完了後Firestoreに保存
 */

import { NewsDocument, WorldNews, JapanNews, validateNewsDocument } from '../../../backend/src/models/news.model';

describe('NewsDocument Model', () => {
  describe('型定義検証', () => {
    it('正しいNewsDocumentオブジェクトを受け入れる', () => {
      const validNews: NewsDocument = {
        date: '2026-01-01',
        worldNews: {
          title: '世界の投資ニュース',
          summary: 'これは約2000文字の要約です。'.repeat(50), // 約2000文字
          updatedAt: new Date('2026-01-01T08:00:00Z'),
        },
        japanNews: {
          title: '日本の投資ニュース',
          summary: 'これは約2000文字の要約です。'.repeat(50), // 約2000文字
          updatedAt: new Date('2026-01-01T08:00:00Z'),
        },
        createdAt: new Date('2026-01-01T08:00:00Z'),
        updatedAt: new Date('2026-01-01T08:00:00Z'),
      };

      expect(validNews.date).toBe('2026-01-01');
      expect(validNews.worldNews.title).toBe('世界の投資ニュース');
      expect(validNews.japanNews.title).toBe('日本の投資ニュース');
    });

    it('世界ニュースの必須フィールドが存在する', () => {
      const worldNews: WorldNews = {
        title: '世界の投資ニュース',
        summary: 'テスト要約',
        updatedAt: new Date(),
      };

      expect(worldNews).toHaveProperty('title');
      expect(worldNews).toHaveProperty('summary');
      expect(worldNews).toHaveProperty('updatedAt');
    });

    it('日本ニュースの必須フィールドが存在する', () => {
      const japanNews: JapanNews = {
        title: '日本の投資ニュース',
        summary: 'テスト要約',
        updatedAt: new Date(),
      };

      expect(japanNews).toHaveProperty('title');
      expect(japanNews).toHaveProperty('summary');
      expect(japanNews).toHaveProperty('updatedAt');
    });
  });

  describe('validateNewsDocument', () => {
    it('有効なニュースドキュメントを検証する', () => {
      const validNews: NewsDocument = {
        date: '2026-01-01',
        worldNews: {
          title: '世界の投資ニュース',
          summary: 'x'.repeat(2000), // 2000文字
          updatedAt: new Date(),
        },
        japanNews: {
          title: '日本の投資ニュース',
          summary: 'x'.repeat(2000), // 2000文字
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => validateNewsDocument(validNews)).not.toThrow();
    });

    it('要約文が短すぎる場合はエラーをスローする', () => {
      const invalidNews: NewsDocument = {
        date: '2026-01-01',
        worldNews: {
          title: '世界の投資ニュース',
          summary: 'x'.repeat(500), // 500文字(短すぎる)
          updatedAt: new Date(),
        },
        japanNews: {
          title: '日本の投資ニュース',
          summary: 'x'.repeat(2000),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => validateNewsDocument(invalidNews)).toThrow('世界ニュースの要約文は1800〜2200文字である必要があります');
    });

    it('要約文が長すぎる場合はエラーをスローする', () => {
      const invalidNews: NewsDocument = {
        date: '2026-01-01',
        worldNews: {
          title: '世界の投資ニュース',
          summary: 'x'.repeat(3000), // 3000文字(長すぎる)
          updatedAt: new Date(),
        },
        japanNews: {
          title: '日本の投資ニュース',
          summary: 'x'.repeat(2000),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => validateNewsDocument(invalidNews)).toThrow('世界ニュースの要約文は1800〜2200文字である必要があります');
    });

    it('日付フォーマットが不正な場合はエラーをスローする', () => {
      const invalidNews: NewsDocument = {
        date: '01-01-2026', // 不正なフォーマット
        worldNews: {
          title: '世界の投資ニュース',
          summary: 'x'.repeat(2000),
          updatedAt: new Date(),
        },
        japanNews: {
          title: '日本の投資ニュース',
          summary: 'x'.repeat(2000),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => validateNewsDocument(invalidNews)).toThrow('日付はYYYY-MM-DD形式である必要があります');
    });

    it('ドキュメントサイズが1MBを超える場合はエラーをスローする', () => {
      // 要約文の文字数制限(1800〜2200文字)をクリアしつつ、
      // 全体のドキュメントサイズが1MBを超える極端なケース
      // (実際のユースケースでは発生しにくいが、境界値テストとして実装)
      const largeNews: NewsDocument = {
        date: '2026-01-01',
        worldNews: {
          title: 'x'.repeat(600000), // タイトルを大きくする(600KB)
          summary: 'x'.repeat(2000), // 2000文字(有効範囲内)
          updatedAt: new Date(),
        },
        japanNews: {
          title: 'x'.repeat(600000), // タイトルを大きくする(600KB)
          summary: 'x'.repeat(2000), // 2000文字(有効範囲内)
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => validateNewsDocument(largeNews)).toThrow('ドキュメントサイズが1MBを超えています');
    });
  });
});
