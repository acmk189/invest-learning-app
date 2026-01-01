/**
 * エラーロガーのテスト
 * Task 2.2: エラーハンドリング共通機能実装
 */

import { ErrorLogger } from '../error-logger';
import { NetworkError, ApiError, FirestoreError, ErrorSeverity } from '../types';
import * as admin from 'firebase-admin';

// Firestoreのモック
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      add: jest.fn(),
    })),
  })),
}));

describe('ErrorLogger', () => {
  let errorLogger: ErrorLogger;
  let mockCollection: jest.Mock;
  let mockAdd: jest.Mock;

  beforeEach(() => {
    mockAdd = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });
    mockCollection = jest.fn(() => ({
      add: mockAdd,
    }));

    const mockFirestore = {
      collection: mockCollection,
    } as any;

    errorLogger = new ErrorLogger(mockFirestore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logError', () => {
    it('should log a network error to Firestore', async () => {
      const error = new NetworkError('ネットワーク接続に失敗しました');

      await errorLogger.logError(error);

      expect(mockCollection).toHaveBeenCalledWith('error_logs');
      expect(mockAdd).toHaveBeenCalledWith({
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

      expect(mockCollection).toHaveBeenCalledWith('error_logs');
      expect(mockAdd).toHaveBeenCalledWith({
        type: 'API',
        message: 'API呼び出しに失敗しました',
        severity: 'HIGH',
        retryable: true,
        timestamp: expect.any(Number),
        stack: expect.any(String),
        name: 'ApiError',
        apiName: 'ClaudeAPI',
        statusCode: 429,
      });
    });

    it('should log a Firestore error with operation type', async () => {
      const error = new FirestoreError('書き込みに失敗しました', undefined, 'write');

      await errorLogger.logError(error);

      expect(mockCollection).toHaveBeenCalledWith('error_logs');
      expect(mockAdd).toHaveBeenCalledWith({
        type: 'FIRESTORE',
        message: '書き込みに失敗しました',
        severity: 'CRITICAL',
        retryable: true,
        timestamp: expect.any(Number),
        stack: expect.any(String),
        name: 'FirestoreError',
        operation: 'write',
      });
    });

    it('should include original error information if provided', async () => {
      const originalError = new Error('Original error message');
      const error = new NetworkError('ネットワーク接続に失敗しました', originalError);

      await errorLogger.logError(error);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          originalError: {
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

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          context,
        })
      );
    });

    it('should handle logging errors gracefully', async () => {
      const error = new NetworkError('ネットワーク接続に失敗しました');
      mockAdd.mockRejectedValueOnce(new Error('Firestore write failed'));

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

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'API',
          message: 'Claude APIタイムアウト',
          context,
        })
      );
    });
  });
});
