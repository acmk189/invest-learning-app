/**
 * エラーハンドリング共通機能のテスト
 * Task 2.2: エラーハンドリング共通機能実装
 */

import {
  AppError,
  NetworkError,
  ApiError,
  DatabaseError,
  ErrorType,
  ErrorSeverity,
} from '../index';

describe('Error Types', () => {
  describe('NetworkError', () => {
    it('should create a network error with correct properties', () => {
      const error = new NetworkError('ネットワーク接続に失敗しました');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('ネットワーク接続に失敗しました');
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(true);
    });

    it('should include original error if provided', () => {
      const originalError = new Error('Connection timeout');
      const error = new NetworkError('ネットワーク接続に失敗しました', originalError);

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('ApiError', () => {
    it('should create an API error with correct properties', () => {
      const error = new ApiError('外部APIからのレスポンスが不正です', 'NewsAPI');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('外部APIからのレスポンスが不正です');
      expect(error.type).toBe(ErrorType.API);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(true);
      expect(error.apiName).toBe('NewsAPI');
    });

    it('should include status code if provided', () => {
      const error = new ApiError('API rate limit exceeded', 'ClaudeAPI', undefined, 429);

      expect(error.statusCode).toBe(429);
    });
  });

  describe('DatabaseError', () => {
    it('should create a Database error with correct properties', () => {
      const error = new DatabaseError('データベースへの接続に失敗しました');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('DatabaseError');
      expect(error.message).toBe('データベースへの接続に失敗しました');
      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.retryable).toBe(true);
    });

    it('should include operation type if provided', () => {
      const error = new DatabaseError('書き込みに失敗しました', undefined, 'write');

      expect(error.operation).toBe('write');
    });
  });

  describe('AppError base class', () => {
    it('should capture stack trace', () => {
      const error = new NetworkError('Test error');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should allow custom severity', () => {
      const error = new NetworkError('Minor network issue');
      error.severity = ErrorSeverity.LOW;

      expect(error.severity).toBe(ErrorSeverity.LOW);
    });

    it('should allow marking error as non-retryable', () => {
      const error = new ApiError('Invalid API key', 'ClaudeAPI');
      error.retryable = false;

      expect(error.retryable).toBe(false);
    });

    it('should include timestamp', () => {
      const beforeTime = Date.now();
      const error = new NetworkError('Test error');
      const afterTime = Date.now();

      expect(error.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(error.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
