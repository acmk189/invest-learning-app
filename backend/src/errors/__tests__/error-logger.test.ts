/**
 * エラーロガーのテスト
 * Task 2.2: エラーハンドリング共通機能実装
 * Task 12: Firebase依存の完全削除 - Supabase対応
 */

import { ErrorLogger } from '../error-logger';
import { NetworkError, ApiError, DatabaseError } from '../types';

describe('ErrorLogger', () => {
  let errorLogger: ErrorLogger;
  let mockInsert: jest.Mock;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom = jest.fn(() => ({
      insert: mockInsert,
    }));

    const mockSupabase = {
      from: mockFrom,
    } as any;

    errorLogger = new ErrorLogger(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logError', () => {
    it('should log a network error to Supabase', async () => {
      const error = new NetworkError('ネットワーク接続に失敗しました');

      await errorLogger.logError(error);

      expect(mockFrom).toHaveBeenCalledWith('error_logs');
      expect(mockInsert).toHaveBeenCalledWith({
        type: 'NETWORK',
        message: 'ネットワーク接続に失敗しました',
        severity: 'HIGH',
        retryable: true,
        timestamp: expect.any(Number),
        stack: expect.any(String),
        name: 'NetworkError',
      });
    });

    it('should log an API error with additional metadata', async () => {
      const error = new ApiError('API呼び出しに失敗しました', 'ClaudeAPI', undefined, 429);

      await errorLogger.logError(error);

      expect(mockFrom).toHaveBeenCalledWith('error_logs');
      expect(mockInsert).toHaveBeenCalledWith({
        type: 'API',
        message: 'API呼び出しに失敗しました',
        severity: 'HIGH',
        retryable: true,
        timestamp: expect.any(Number),
        stack: expect.any(String),
        name: 'ApiError',
        api_name: 'ClaudeAPI',
        status_code: 429,
      });
    });

    it('should log a Database error with operation type', async () => {
      const error = new DatabaseError('書き込みに失敗しました', undefined, 'write');

      await errorLogger.logError(error);

      expect(mockFrom).toHaveBeenCalledWith('error_logs');
      expect(mockInsert).toHaveBeenCalledWith({
        type: 'DATABASE',
        message: '書き込みに失敗しました',
        severity: 'CRITICAL',
        retryable: true,
        timestamp: expect.any(Number),
        stack: expect.any(String),
        name: 'DatabaseError',
        operation: 'write',
      });
    });

    it('should include original error information if provided', async () => {
      const originalError = new Error('Original error message');
      const error = new NetworkError('ネットワーク接続に失敗しました', originalError);

      await errorLogger.logError(error);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          original_error: {
            message: 'Original error message',
            name: 'Error',
            stack: expect.any(String),
          },
        })
      );
    });

    it('should include additional context if provided', async () => {
      const error = new NetworkError('ネットワーク接続に失敗しました');
      const context = {
        url: 'https://api.example.com',
        method: 'GET',
        userId: 'user123',
      };

      await errorLogger.logError(error, context);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          context,
        })
      );
    });

    it('should handle logging errors gracefully', async () => {
      const error = new NetworkError('ネットワーク接続に失敗しました');
      mockInsert.mockResolvedValueOnce({ error: { message: 'Supabase write failed' } });

      // エラーログの記録に失敗しても例外をスローしない
      await expect(errorLogger.logError(error)).resolves.not.toThrow();
    });
  });

  describe('logErrorWithContext', () => {
    it('should log error with contextual information', async () => {
      const error = new ApiError('Claude APIタイムアウト', 'ClaudeAPI');
      const context = {
        endpoint: '/v1/messages',
        requestId: 'req-123',
        timeout: 30000,
      };

      await errorLogger.logErrorWithContext(error, context);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'API',
          message: 'Claude APIタイムアウト',
          context,
        })
      );
    });
  });
});
