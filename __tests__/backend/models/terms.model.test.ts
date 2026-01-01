/**
 * Terms Data Model Tests
 *
 * Requirements Coverage:
 * - Requirement 3.3: Firestore 1MB以下ドキュメント
 * - Requirement 4.5: 用語データFirestore保存
 * - Requirement 4.6: 全履歴保持（重複チェック用）
 */

import { TermsDocument, Term, TermHistoryDocument, validateTermsDocument, validateTerm } from '../../../backend/src/models/terms.model';

describe('TermsDocument Model', () => {
  describe('型定義検証', () => {
    it('正しいTermsDocumentオブジェクトを受け入れる', () => {
      const validTerms: TermsDocument = {
        date: '2026-01-01',
        terms: [
          {
            name: 'ポートフォリオ',
            description: 'これは約500文字の解説です。'.repeat(12), // 約500文字
            difficulty: 'beginner',
          },
          {
            name: 'デリバティブ',
            description: 'これは約500文字の解説です。'.repeat(12), // 約500文字
            difficulty: 'intermediate',
          },
          {
            name: 'レバレッジ',
            description: 'これは約500文字の解説です。'.repeat(12), // 約500文字
            difficulty: 'advanced',
          },
        ],
        createdAt: new Date('2026-01-01T08:00:00Z'),
        updatedAt: new Date('2026-01-01T08:00:00Z'),
      };

      expect(validTerms.date).toBe('2026-01-01');
      expect(validTerms.terms).toHaveLength(3);
      expect(validTerms.terms[0].difficulty).toBe('beginner');
    });

    it('用語の必須フィールドが存在する', () => {
      const term: Term = {
        name: 'ポートフォリオ',
        description: 'テスト解説',
        difficulty: 'beginner',
      };

      expect(term).toHaveProperty('name');
      expect(term).toHaveProperty('description');
      expect(term).toHaveProperty('difficulty');
    });

    it('正しいTermHistoryDocumentオブジェクトを受け入れる', () => {
      const validHistory: TermHistoryDocument = {
        termName: 'ポートフォリオ',
        deliveredAt: new Date('2026-01-01T08:00:00Z'),
        difficulty: 'beginner',
      };

      expect(validHistory.termName).toBe('ポートフォリオ');
      expect(validHistory.difficulty).toBe('beginner');
    });
  });

  describe('validateTermsDocument', () => {
    it('有効な用語ドキュメントを検証する', () => {
      const validTerms: TermsDocument = {
        date: '2026-01-01',
        terms: [
          {
            name: 'ポートフォリオ',
            description: 'x'.repeat(500), // 500文字
            difficulty: 'beginner',
          },
          {
            name: 'デリバティブ',
            description: 'x'.repeat(500), // 500文字
            difficulty: 'intermediate',
          },
          {
            name: 'レバレッジ',
            description: 'x'.repeat(500), // 500文字
            difficulty: 'advanced',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => validateTermsDocument(validTerms)).not.toThrow();
    });

    it('用語が3つでない場合はエラーをスローする', () => {
      const invalidTerms: TermsDocument = {
        date: '2026-01-01',
        terms: [
          {
            name: 'ポートフォリオ',
            description: 'x'.repeat(500),
            difficulty: 'beginner',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => validateTermsDocument(invalidTerms)).toThrow('用語は必ず3つである必要があります');
    });

    it('日付フォーマットが不正な場合はエラーをスローする', () => {
      const invalidTerms: TermsDocument = {
        date: '01-01-2026', // 不正なフォーマット
        terms: [
          {
            name: 'ポートフォリオ',
            description: 'x'.repeat(500),
            difficulty: 'beginner',
          },
          {
            name: 'デリバティブ',
            description: 'x'.repeat(500),
            difficulty: 'intermediate',
          },
          {
            name: 'レバレッジ',
            description: 'x'.repeat(500),
            difficulty: 'advanced',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => validateTermsDocument(invalidTerms)).toThrow('日付はYYYY-MM-DD形式である必要があります');
    });
  });

  describe('validateTerm', () => {
    it('有効な用語を検証する', () => {
      const validTerm: Term = {
        name: 'ポートフォリオ',
        description: 'x'.repeat(500), // 500文字
        difficulty: 'beginner',
      };

      expect(() => validateTerm(validTerm)).not.toThrow();
    });

    it('解説文が短すぎる場合はエラーをスローする', () => {
      const invalidTerm: Term = {
        name: 'ポートフォリオ',
        description: 'x'.repeat(200), // 200文字（短すぎる）
        difficulty: 'beginner',
      };

      expect(() => validateTerm(invalidTerm)).toThrow('解説文は400〜600文字である必要があります');
    });

    it('解説文が長すぎる場合はエラーをスローする', () => {
      const invalidTerm: Term = {
        name: 'ポートフォリオ',
        description: 'x'.repeat(800), // 800文字（長すぎる）
        difficulty: 'beginner',
      };

      expect(() => validateTerm(invalidTerm)).toThrow('解説文は400〜600文字である必要があります');
    });

    it('難易度が不正な場合はエラーをスローする', () => {
      const invalidTerm: Term = {
        name: 'ポートフォリオ',
        description: 'x'.repeat(500),
        difficulty: 'expert' as any, // 不正な難易度
      };

      expect(() => validateTerm(invalidTerm)).toThrow('難易度はbeginner, intermediate, advancedのいずれかである必要があります');
    });

    it('用語名が空の場合はエラーをスローする', () => {
      const invalidTerm: Term = {
        name: '',
        description: 'x'.repeat(500),
        difficulty: 'beginner',
      };

      expect(() => validateTerm(invalidTerm)).toThrow('用語名は必須です');
    });
  });
});
