/**
 * Supabase型定義のテスト
 *
 * Task 3.1: Supabase SDK型定義テスト
 * TDD: RED → GREEN → REFACTOR
 */

import {
  isValidDifficulty,
  isValidDateString,
  isValidISODateString,
  VALID_DIFFICULTIES,
  type NewsRow,
  type TermRow,
  type TermHistoryRow,
  type BatchMetadataRow,
} from '../supabase.types';

describe('Supabase Types', () => {
  describe('VALID_DIFFICULTIES', () => {
    it('should contain exactly 3 difficulty levels', () => {
      expect(VALID_DIFFICULTIES).toHaveLength(3);
    });

    it('should contain beginner, intermediate, and advanced', () => {
      expect(VALID_DIFFICULTIES).toContain('beginner');
      expect(VALID_DIFFICULTIES).toContain('intermediate');
      expect(VALID_DIFFICULTIES).toContain('advanced');
    });
  });

  describe('isValidDifficulty', () => {
    it('should return true for valid difficulty values', () => {
      expect(isValidDifficulty('beginner')).toBe(true);
      expect(isValidDifficulty('intermediate')).toBe(true);
      expect(isValidDifficulty('advanced')).toBe(true);
    });

    it('should return false for invalid difficulty values', () => {
      expect(isValidDifficulty('expert')).toBe(false);
      expect(isValidDifficulty('easy')).toBe(false);
      expect(isValidDifficulty('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidDifficulty(null)).toBe(false);
      expect(isValidDifficulty(undefined)).toBe(false);
      expect(isValidDifficulty(123)).toBe(false);
      expect(isValidDifficulty({})).toBe(false);
    });
  });

  describe('isValidDateString', () => {
    it('should return true for valid YYYY-MM-DD format', () => {
      expect(isValidDateString('2024-01-01')).toBe(true);
      expect(isValidDateString('2024-12-31')).toBe(true);
      expect(isValidDateString('2026-01-10')).toBe(true);
    });

    it('should return false for invalid date formats', () => {
      expect(isValidDateString('01-01-2024')).toBe(false);
      expect(isValidDateString('2024/01/01')).toBe(false);
      expect(isValidDateString('2024-1-1')).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDateString('2024-13-01')).toBe(false);
      expect(isValidDateString('2024-02-30')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidDateString(null)).toBe(false);
      expect(isValidDateString(undefined)).toBe(false);
      expect(isValidDateString(20240101)).toBe(false);
    });
  });

  describe('isValidISODateString', () => {
    it('should return true for valid ISO 8601 format', () => {
      expect(isValidISODateString('2024-01-01T00:00:00Z')).toBe(true);
      expect(isValidISODateString('2024-01-01T12:30:45.123Z')).toBe(true);
      expect(isValidISODateString('2024-01-01T08:00:00+09:00')).toBe(true);
    });

    it('should return false for YYYY-MM-DD format (missing T)', () => {
      expect(isValidISODateString('2024-01-01')).toBe(false);
    });

    it('should return false for invalid date strings', () => {
      expect(isValidISODateString('invalid-date')).toBe(false);
      expect(isValidISODateString('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidISODateString(null)).toBe(false);
      expect(isValidISODateString(undefined)).toBe(false);
    });
  });

  describe('Type structures', () => {
    it('should allow creating a valid NewsRow', () => {
      const newsRow: NewsRow = {
        date: '2024-01-01',
        world_news_title: 'World News Title',
        world_news_summary: 'World news summary text...',
        japan_news_title: 'Japan News Title',
        japan_news_summary: 'Japan news summary text...',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(newsRow.date).toBe('2024-01-01');
      expect(newsRow.world_news_title).toBe('World News Title');
    });

    it('should allow creating a valid TermRow', () => {
      const termRow: TermRow = {
        id: 1,
        date: '2024-01-01',
        name: 'PER（株価収益率）',
        description: '株価を1株当たり利益で割った指標...',
        difficulty: 'beginner',
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(termRow.id).toBe(1);
      expect(termRow.difficulty).toBe('beginner');
    });

    it('should allow creating a valid TermHistoryRow', () => {
      const historyRow: TermHistoryRow = {
        id: 1,
        term_name: 'PER（株価収益率）',
        delivered_at: '2024-01-01T08:00:00Z',
        difficulty: 'beginner',
      };

      expect(historyRow.term_name).toBe('PER（株価収益率）');
    });

    it('should allow creating a valid BatchMetadataRow', () => {
      const metadataRow: BatchMetadataRow = {
        id: 1,
        news_last_updated: '2024-01-01T08:00:00Z',
        terms_last_updated: '2024-01-01T08:00:00Z',
      };

      expect(metadataRow.id).toBe(1);
      expect(metadataRow.news_last_updated).toBe('2024-01-01T08:00:00Z');
    });

    it('should allow null values in BatchMetadataRow timestamps', () => {
      const metadataRow: BatchMetadataRow = {
        id: 1,
        news_last_updated: null,
        terms_last_updated: null,
      };

      expect(metadataRow.news_last_updated).toBeNull();
      expect(metadataRow.terms_last_updated).toBeNull();
    });
  });
});
