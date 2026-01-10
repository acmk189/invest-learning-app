/**
 * Supabase エラーハンドリング テスト
 * Task 10.3: Supabaseエラー型対応
 *
 * SupabaseErrorクラスと変換ユーティリティのテスト
 */

import {
  SupabaseError,
  SupabaseErrorCode,
  toSupabaseError,
  ERROR_MESSAGES,
  isOfflineError,
  isRetryableError,
} from '../errors';
import { SupabaseQueryError } from '../queries';

describe('SupabaseError', () => {
  describe('SupabaseError class', () => {
    it('should create an instance with correct properties', () => {
      const error = new SupabaseError(
        'CONNECTION_FAILED',
        'Connection failed message',
        undefined,
        true
      );

      expect(error).toBeInstanceOf(SupabaseError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('SupabaseError');
      expect(error.code).toBe('CONNECTION_FAILED');
      expect(error.message).toBe('Connection failed message');
      expect(error.retryable).toBe(true);
      expect(error.originalError).toBeUndefined();
    });

    it('should store original error', () => {
      const originalError = new Error('Original error');
      const error = new SupabaseError(
        'UNKNOWN',
        'Unknown error',
        originalError,
        false
      );

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('toSupabaseError', () => {
    it('should return existing SupabaseError unchanged', () => {
      const existing = new SupabaseError('TIMEOUT', 'Timeout', undefined, true);
      const result = toSupabaseError(existing);

      expect(result).toBe(existing);
    });

    it('should convert SupabaseQueryError to SupabaseError', () => {
      const queryError = new SupabaseQueryError(
        'PGRST116',
        'No rows found',
        null,
        null
      );
      const result = toSupabaseError(queryError);

      expect(result).toBeInstanceOf(SupabaseError);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.retryable).toBe(false);
    });

    it('should map connection timeout error codes', () => {
      const queryError = new SupabaseQueryError(
        '57014',
        'Query timeout',
        null,
        null
      );
      const result = toSupabaseError(queryError);

      expect(result.code).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
    });

    it('should map authentication error codes', () => {
      const queryError = new SupabaseQueryError(
        '28000',
        'Invalid auth',
        null,
        null
      );
      const result = toSupabaseError(queryError);

      expect(result.code).toBe('PERMISSION_DENIED');
      expect(result.retryable).toBe(false);
    });

    it('should map table not found error codes', () => {
      const queryError = new SupabaseQueryError(
        '42P01',
        'Table not found',
        null,
        null
      );
      const result = toSupabaseError(queryError);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.retryable).toBe(false);
    });

    it('should detect timeout from error message', () => {
      const error = new Error('Request timeout occurred');
      const result = toSupabaseError(error);

      expect(result.code).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
    });

    it('should detect network error from error message', () => {
      const error = new Error('Network request failed');
      const result = toSupabaseError(error);

      expect(result.code).toBe('CONNECTION_FAILED');
      expect(result.retryable).toBe(true);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Some random error');
      const result = toSupabaseError(error);

      expect(result.code).toBe('UNKNOWN');
      expect(result.retryable).toBe(false);
    });

    it('should handle non-Error objects', () => {
      const result = toSupabaseError('string error');

      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe(ERROR_MESSAGES.UNKNOWN);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have messages for all error codes', () => {
      const codes: SupabaseErrorCode[] = [
        'CONNECTION_FAILED',
        'TIMEOUT',
        'NOT_FOUND',
        'PERMISSION_DENIED',
        'UNAVAILABLE',
        'CANCELLED',
        'UNKNOWN',
      ];

      codes.forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(typeof ERROR_MESSAGES[code]).toBe('string');
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
      });
    });

    it('should have Japanese error messages', () => {
      // Check that messages contain Japanese characters
      expect(ERROR_MESSAGES.CONNECTION_FAILED).toMatch(/[ぁ-んァ-ン一-龥]/);
      expect(ERROR_MESSAGES.TIMEOUT).toMatch(/[ぁ-んァ-ン一-龥]/);
    });
  });

  describe('isOfflineError', () => {
    it('should return true for CONNECTION_FAILED', () => {
      const error = new SupabaseError(
        'CONNECTION_FAILED',
        'Connection failed',
        undefined,
        true
      );
      expect(isOfflineError(error)).toBe(true);
    });

    it('should return true for UNAVAILABLE', () => {
      const error = new SupabaseError(
        'UNAVAILABLE',
        'Service unavailable',
        undefined,
        true
      );
      expect(isOfflineError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new SupabaseError(
        'NOT_FOUND',
        'Not found',
        undefined,
        false
      );
      expect(isOfflineError(error)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
      const error = new SupabaseError(
        'CONNECTION_FAILED',
        'Connection failed',
        undefined,
        true
      );
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new SupabaseError(
        'NOT_FOUND',
        'Not found',
        undefined,
        false
      );
      expect(isRetryableError(error)).toBe(false);
    });
  });
});
