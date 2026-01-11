/**
 * モデル変換関数のテスト
 *
 * Task 4: バックエンドデータモデル移行
 * TDD: RED → GREEN → REFACTOR
 *
 * 内部モデル(Date型)からSupabase用型(ISO 8601文字列)への
 * 変換関数をテストします。
 */

import {
  newsDocumentToNewsRow,
  termsDocumentToTermRows,
  termToTermInsertPayload,
  termHistoryDocumentToPayload,
  batchMetadataRowToClientFormat,
  createBatchMetadataUpdatePayload,
  validateNewsRow,
  validateTermInsertPayload,
} from '../model-converters';
import type { NewsDocument } from '../news.model';
import type { TermsDocument, TermHistoryDocument, Term } from '../terms.model';
import type {
  NewsRow,
  TermInsertPayload,
  BatchMetadataRow,
} from '../supabase.types';

describe('Model Converters', () => {
  describe('newsDocumentToNewsRow', () => {
    const validNewsDocument: NewsDocument = {
      date: '2024-01-10',
      worldNews: {
        title: '世界のニュースタイトル',
        summary: 'A'.repeat(2000), // 2000文字の要約
        updatedAt: new Date('2024-01-10T08:00:00Z'),
      },
      japanNews: {
        title: '日本のニュースタイトル',
        summary: 'B'.repeat(2000), // 2000文字の要約
        updatedAt: new Date('2024-01-10T08:00:00Z'),
      },
      createdAt: new Date('2024-01-10T00:00:00Z'),
      updatedAt: new Date('2024-01-10T08:00:00Z'),
    };

    it('NewsDocumentをNewsRowに正しく変換する', () => {
      const result = newsDocumentToNewsRow(validNewsDocument);

      expect(result.date).toBe('2024-01-10');
      expect(result.world_news_title).toBe('世界のニュースタイトル');
      expect(result.world_news_summary).toBe('A'.repeat(2000));
      expect(result.japan_news_title).toBe('日本のニュースタイトル');
      expect(result.japan_news_summary).toBe('B'.repeat(2000));
    });

    it('Date型をISO 8601文字列に変換する', () => {
      const result = newsDocumentToNewsRow(validNewsDocument);

      // ISO 8601形式("T"を含む)であることを確認
      expect(result.created_at).toContain('T');
      expect(result.updated_at).toContain('T');

      // 有効なDate文字列であることを確認
      expect(new Date(result.created_at).getTime()).not.toBeNaN();
      expect(new Date(result.updated_at).getTime()).not.toBeNaN();
    });
  });

  describe('termsDocumentToTermRows', () => {
    const validTerms: Term[] = [
      { name: 'PER', description: 'C'.repeat(500), difficulty: 'beginner' },
      { name: 'PBR', description: 'D'.repeat(500), difficulty: 'intermediate' },
      { name: 'ROE', description: 'E'.repeat(500), difficulty: 'advanced' },
    ];

    const validTermsDocument: TermsDocument = {
      date: '2024-01-10',
      terms: validTerms,
      createdAt: new Date('2024-01-10T00:00:00Z'),
      updatedAt: new Date('2024-01-10T08:00:00Z'),
    };

    it('TermsDocumentをTermInsertPayload配列に正しく変換する', () => {
      const result = termsDocumentToTermRows(validTermsDocument);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-01-10');
      expect(result[0].name).toBe('PER');
      expect(result[0].difficulty).toBe('beginner');
    });

    it('各用語に正しい日付が設定される', () => {
      const result = termsDocumentToTermRows(validTermsDocument);

      result.forEach((row) => {
        expect(row.date).toBe('2024-01-10');
      });
    });
  });

  describe('termToTermInsertPayload', () => {
    const validTerm: Term = {
      name: 'PER(株価収益率)',
      description: 'F'.repeat(500),
      difficulty: 'beginner',
    };

    it('Termを正しいペイロードに変換する', () => {
      const result = termToTermInsertPayload(validTerm, '2024-01-10');

      expect(result.date).toBe('2024-01-10');
      expect(result.name).toBe('PER(株価収益率)');
      expect(result.description).toBe('F'.repeat(500));
      expect(result.difficulty).toBe('beginner');
    });
  });

  describe('termHistoryDocumentToPayload', () => {
    const validHistoryDocument: TermHistoryDocument = {
      termName: 'PER(株価収益率)',
      deliveredAt: new Date('2024-01-10T08:00:00Z'),
      difficulty: 'beginner',
    };

    it('TermHistoryDocumentを正しいペイロードに変換する', () => {
      const result = termHistoryDocumentToPayload(validHistoryDocument);

      expect(result.term_name).toBe('PER(株価収益率)');
      expect(result.difficulty).toBe('beginner');
    });

    it('Date型をISO 8601文字列に変換する', () => {
      const result = termHistoryDocumentToPayload(validHistoryDocument);

      expect(result.delivered_at).toContain('T');
      expect(new Date(result.delivered_at).getTime()).not.toBeNaN();
    });
  });

  describe('validateNewsRow', () => {
    it('有効なNewsRowを検証する', () => {
      const validRow: NewsRow = {
        date: '2024-01-10',
        world_news_title: '世界ニュースタイトル',
        world_news_summary: 'A'.repeat(2000),
        japan_news_title: '日本ニュースタイトル',
        japan_news_summary: 'B'.repeat(2000),
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-10T08:00:00Z',
      };

      expect(() => validateNewsRow(validRow)).not.toThrow();
    });

    it('日付形式が不正な場合エラーを投げる', () => {
      const invalidRow: NewsRow = {
        date: '2024/01/10', // 不正な形式
        world_news_title: '世界ニュースタイトル',
        world_news_summary: 'A'.repeat(2000),
        japan_news_title: '日本ニュースタイトル',
        japan_news_summary: 'B'.repeat(2000),
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-10T08:00:00Z',
      };

      expect(() => validateNewsRow(invalidRow)).toThrow('日付はYYYY-MM-DD形式である必要があります');
    });

    it('世界ニュース要約が短すぎる場合エラーを投げる', () => {
      const invalidRow: NewsRow = {
        date: '2024-01-10',
        world_news_title: '世界ニュースタイトル',
        world_news_summary: 'A'.repeat(1799), // 1799文字(短すぎる)
        japan_news_title: '日本ニュースタイトル',
        japan_news_summary: 'B'.repeat(2000),
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-10T08:00:00Z',
      };

      expect(() => validateNewsRow(invalidRow)).toThrow('世界ニュースの要約文は1800〜2200文字である必要があります');
    });

    it('日本ニュース要約が長すぎる場合エラーを投げる', () => {
      const invalidRow: NewsRow = {
        date: '2024-01-10',
        world_news_title: '世界ニュースタイトル',
        world_news_summary: 'A'.repeat(2000),
        japan_news_title: '日本ニュースタイトル',
        japan_news_summary: 'B'.repeat(2201), // 2201文字(長すぎる)
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-10T08:00:00Z',
      };

      expect(() => validateNewsRow(invalidRow)).toThrow('日本ニュースの要約文は1800〜2200文字である必要があります');
    });
  });

  describe('validateTermInsertPayload', () => {
    it('有効なTermInsertPayloadを検証する', () => {
      const validPayload: TermInsertPayload = {
        date: '2024-01-10',
        name: 'PER(株価収益率)',
        description: 'C'.repeat(500),
        difficulty: 'beginner',
      };

      expect(() => validateTermInsertPayload(validPayload)).not.toThrow();
    });

    it('用語名が空の場合エラーを投げる', () => {
      const invalidPayload: TermInsertPayload = {
        date: '2024-01-10',
        name: '', // 空
        description: 'C'.repeat(500),
        difficulty: 'beginner',
      };

      expect(() => validateTermInsertPayload(invalidPayload)).toThrow('用語名は必須です');
    });

    it('解説文が短すぎる場合エラーを投げる', () => {
      const invalidPayload: TermInsertPayload = {
        date: '2024-01-10',
        name: 'PER',
        description: 'C'.repeat(399), // 399文字(短すぎる)
        difficulty: 'beginner',
      };

      expect(() => validateTermInsertPayload(invalidPayload)).toThrow('解説文は400〜600文字である必要があります');
    });

    it('解説文が長すぎる場合エラーを投げる', () => {
      const invalidPayload: TermInsertPayload = {
        date: '2024-01-10',
        name: 'PER',
        description: 'C'.repeat(601), // 601文字(長すぎる)
        difficulty: 'beginner',
      };

      expect(() => validateTermInsertPayload(invalidPayload)).toThrow('解説文は400〜600文字である必要があります');
    });

    it('不正な難易度の場合エラーを投げる', () => {
      const invalidPayload = {
        date: '2024-01-10',
        name: 'PER',
        description: 'C'.repeat(500),
        difficulty: 'expert' as any, // 不正な値
      };

      expect(() => validateTermInsertPayload(invalidPayload)).toThrow(
        '難易度はbeginner, intermediate, advancedのいずれかである必要があります'
      );
    });
  });

  describe('batchMetadataRowToClientFormat', () => {
    it('BatchMetadataRowをクライアント向けフォーマットに変換する', () => {
      const metadataRow: BatchMetadataRow = {
        id: 1,
        news_last_updated: '2024-01-10T08:00:00Z',
        terms_last_updated: '2024-01-10T08:00:00Z',
      };

      const result = batchMetadataRowToClientFormat(metadataRow);

      expect(result.newsLastUpdated).toBe(new Date('2024-01-10T08:00:00Z').getTime());
      expect(result.termsLastUpdated).toBe(new Date('2024-01-10T08:00:00Z').getTime());
    });

    it('null値を0に変換する', () => {
      const metadataRow: BatchMetadataRow = {
        id: 1,
        news_last_updated: null,
        terms_last_updated: null,
      };

      const result = batchMetadataRowToClientFormat(metadataRow);

      expect(result.newsLastUpdated).toBe(0);
      expect(result.termsLastUpdated).toBe(0);
    });

    it('片方だけnullの場合も正しく変換する', () => {
      const metadataRow: BatchMetadataRow = {
        id: 1,
        news_last_updated: '2024-01-10T08:00:00Z',
        terms_last_updated: null,
      };

      const result = batchMetadataRowToClientFormat(metadataRow);

      expect(result.newsLastUpdated).toBe(new Date('2024-01-10T08:00:00Z').getTime());
      expect(result.termsLastUpdated).toBe(0);
    });
  });

  describe('createBatchMetadataUpdatePayload', () => {
    it('news用の更新ペイロードを生成する', () => {
      const now = new Date('2024-01-10T08:00:00Z');
      const result = createBatchMetadataUpdatePayload('news', now);

      expect(result.news_last_updated).toBe('2024-01-10T08:00:00.000Z');
      expect(result.terms_last_updated).toBeUndefined();
    });

    it('terms用の更新ペイロードを生成する', () => {
      const now = new Date('2024-01-10T08:00:00Z');
      const result = createBatchMetadataUpdatePayload('terms', now);

      expect(result.news_last_updated).toBeUndefined();
      expect(result.terms_last_updated).toBe('2024-01-10T08:00:00.000Z');
    });
  });
});
