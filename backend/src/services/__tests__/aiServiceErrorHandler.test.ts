/**
 * AIサービスエラーハンドラーのテスト
 * Task 3.5: AIサービスエラーハンドリング
 *
 * TDD: REDフェーズ - 実装前にテストを作成
 */

import {
  AIServiceError,
  AIServiceTimeoutError,
  AIServiceUnavailableError,
  isAIServiceError,
  isTimeoutError,
  AIServiceErrorHandler,
  AIServiceErrorHandlerConfig,
} from '../aiServiceErrorHandler';
import { ErrorLogger } from '../../errors/error-logger';
import { ErrorSeverity } from '../../errors/types';

// ErrorLoggerをモック
jest.mock('../../errors/error-logger');

// Anthropic SDKのエラー形式をモック
class MockAnthropicAPIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

class MockAnthropicTimeoutError extends Error {
  constructor() {
    super('Request timed out');
    this.name = 'APIConnectionTimeoutError';
  }
}

class MockAnthropicConnectionError extends Error {
  constructor() {
    super('Connection failed');
    this.name = 'APIConnectionError';
  }
}

describe('AIServiceError', () => {
  describe('コンストラクタ', () => {
    it('正しいプロパティでインスタンスを作成できる', () => {
      const error = new AIServiceError('AI service failed', 'news-summary');

      expect(error.message).toBe('AI service failed');
      expect(error.operation).toBe('news-summary');
      expect(error.name).toBe('AIServiceError');
      expect(error.retryable).toBe(true);
    });

    it('originalErrorを保持できる', () => {
      const originalError = new Error('Original error');
      const error = new AIServiceError(
        'AI service failed',
        'term-generation',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });
  });
});

describe('AIServiceTimeoutError', () => {
  describe('コンストラクタ', () => {
    it('正しいプロパティでインスタンスを作成できる', () => {
      const error = new AIServiceTimeoutError('Request timed out', 30000);

      expect(error.message).toBe('Request timed out');
      expect(error.timeoutMs).toBe(30000);
      expect(error.name).toBe('AIServiceTimeoutError');
      expect(error.retryable).toBe(true);
    });

    it('operationを指定できる', () => {
      const error = new AIServiceTimeoutError(
        'Request timed out',
        30000,
        'news-summary'
      );

      expect(error.operation).toBe('news-summary');
    });
  });
});

describe('AIServiceUnavailableError', () => {
  describe('コンストラクタ', () => {
    it('正しいプロパティでインスタンスを作成できる', () => {
      const error = new AIServiceUnavailableError(
        'Service unavailable',
        503,
        'term-generation'
      );

      expect(error.message).toBe('Service unavailable');
      expect(error.statusCode).toBe(503);
      expect(error.operation).toBe('term-generation');
      expect(error.name).toBe('AIServiceUnavailableError');
      expect(error.retryable).toBe(true);
    });

    it('HIGH severityが設定される', () => {
      const error = new AIServiceUnavailableError('Service unavailable', 503);

      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });
});

describe('isAIServiceError', () => {
  it('AIServiceErrorを検出できる', () => {
    const error = new AIServiceError('AI service failed', 'test');

    expect(isAIServiceError(error)).toBe(true);
  });

  it('AIServiceTimeoutErrorを検出できる', () => {
    const error = new AIServiceTimeoutError('Timeout', 30000);

    expect(isAIServiceError(error)).toBe(true);
  });

  it('AIServiceUnavailableErrorを検出できる', () => {
    const error = new AIServiceUnavailableError('Unavailable', 503);

    expect(isAIServiceError(error)).toBe(true);
  });

  it('通常のエラーはfalseを返す', () => {
    const error = new Error('Normal error');

    expect(isAIServiceError(error)).toBe(false);
  });
});

describe('isTimeoutError', () => {
  it('AIServiceTimeoutErrorを検出できる', () => {
    const error = new AIServiceTimeoutError('Timeout', 30000);

    expect(isTimeoutError(error)).toBe(true);
  });

  it('Anthropic APIConnectionTimeoutErrorを検出できる', () => {
    const error = new MockAnthropicTimeoutError();

    expect(isTimeoutError(error)).toBe(true);
  });

  it('メッセージに"timeout"を含むエラーを検出できる', () => {
    const error = new Error('Connection timeout occurred');

    expect(isTimeoutError(error)).toBe(true);
  });

  it('メッセージに"timed out"を含むエラーを検出できる', () => {
    const error = new Error('Request timed out');

    expect(isTimeoutError(error)).toBe(true);
  });

  it('通常のエラーはfalseを返す', () => {
    const error = new Error('Some other error');

    expect(isTimeoutError(error)).toBe(false);
  });
});

describe('AIServiceErrorHandler', () => {
  let mockErrorLogger: jest.Mocked<ErrorLogger>;
  let mockFirestore: any;

  beforeEach(() => {
    mockFirestore = {
      collection: jest.fn().mockReturnValue({
        add: jest.fn().mockResolvedValue({}),
      }),
    };
    mockErrorLogger = new ErrorLogger(mockFirestore) as jest.Mocked<ErrorLogger>;
    mockErrorLogger.logError = jest.fn().mockResolvedValue(undefined);
  });

  describe('コンストラクタ', () => {
    it('デフォルト設定でインスタンスを作成できる', () => {
      const handler = new AIServiceErrorHandler();

      const config = handler.getConfig();
      expect(config.defaultTimeoutMs).toBe(30000);
      expect(config.logErrors).toBe(true);
    });

    it('カスタム設定でインスタンスを作成できる', () => {
      const config: AIServiceErrorHandlerConfig = {
        defaultTimeoutMs: 60000,
        logErrors: false,
      };
      const handler = new AIServiceErrorHandler(config);

      expect(handler.getConfig().defaultTimeoutMs).toBe(60000);
      expect(handler.getConfig().logErrors).toBe(false);
    });
  });

  describe('handleError', () => {
    it('タイムアウトエラーをAIServiceTimeoutErrorに変換する', () => {
      const handler = new AIServiceErrorHandler();
      const timeoutError = new MockAnthropicTimeoutError();

      const result = handler.handleError(timeoutError, 'news-summary');

      expect(result).toBeInstanceOf(AIServiceTimeoutError);
      expect(result.operation).toBe('news-summary');
    });

    it('503エラーをAIServiceUnavailableErrorに変換する', () => {
      const handler = new AIServiceErrorHandler();
      const apiError = new MockAnthropicAPIError('Service unavailable', 503);

      const result = handler.handleError(apiError, 'term-generation');

      expect(result).toBeInstanceOf(AIServiceUnavailableError);
      expect((result as AIServiceUnavailableError).statusCode).toBe(503);
    });

    it('500エラーをAIServiceUnavailableErrorに変換する', () => {
      const handler = new AIServiceErrorHandler();
      const apiError = new MockAnthropicAPIError('Internal server error', 500);

      const result = handler.handleError(apiError, 'news-summary');

      expect(result).toBeInstanceOf(AIServiceUnavailableError);
    });

    it('502エラーをAIServiceUnavailableErrorに変換する', () => {
      const handler = new AIServiceErrorHandler();
      const apiError = new MockAnthropicAPIError('Bad gateway', 502);

      const result = handler.handleError(apiError, 'news-summary');

      expect(result).toBeInstanceOf(AIServiceUnavailableError);
    });

    it('504エラーをAIServiceUnavailableErrorに変換する', () => {
      const handler = new AIServiceErrorHandler();
      const apiError = new MockAnthropicAPIError('Gateway timeout', 504);

      const result = handler.handleError(apiError, 'news-summary');

      expect(result).toBeInstanceOf(AIServiceUnavailableError);
    });

    it('接続エラーをAIServiceErrorに変換する', () => {
      const handler = new AIServiceErrorHandler();
      const connectionError = new MockAnthropicConnectionError();

      const result = handler.handleError(connectionError, 'term-generation');

      expect(result).toBeInstanceOf(AIServiceError);
      expect(result.operation).toBe('term-generation');
    });

    it('その他のエラーをAIServiceErrorに変換する', () => {
      const handler = new AIServiceErrorHandler();
      const otherError = new Error('Unknown error');

      const result = handler.handleError(otherError, 'news-summary');

      expect(result).toBeInstanceOf(AIServiceError);
    });

    it('既存のAIServiceErrorはそのまま返す', () => {
      const handler = new AIServiceErrorHandler();
      const existingError = new AIServiceError('Already wrapped', 'test');

      const result = handler.handleError(existingError, 'news-summary');

      expect(result).toBe(existingError);
    });
  });

  describe('logError', () => {
    it('ErrorLoggerを使用してエラーを記録する', async () => {
      const handler = new AIServiceErrorHandler({
        errorLogger: mockErrorLogger,
      });
      const error = new AIServiceError('Test error', 'news-summary');

      await handler.logError(error);

      expect(mockErrorLogger.logError).toHaveBeenCalledWith(error, {
        service: 'claude-api',
        operation: 'news-summary',
      });
    });

    it('コンテキスト情報を追加してログを記録する', async () => {
      const handler = new AIServiceErrorHandler({
        errorLogger: mockErrorLogger,
      });
      const error = new AIServiceError('Test error', 'term-generation');

      await handler.logError(error, { attempt: 1, model: 'haiku' });

      expect(mockErrorLogger.logError).toHaveBeenCalledWith(error, {
        service: 'claude-api',
        operation: 'term-generation',
        attempt: 1,
        model: 'haiku',
      });
    });

    it('ErrorLoggerが未設定の場合はコンソールに出力する', async () => {
      const handler = new AIServiceErrorHandler();
      const error = new AIServiceError('Test error', 'news-summary');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await handler.logError(error);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('handleAndLog', () => {
    it('エラーを変換してログを記録する', async () => {
      const handler = new AIServiceErrorHandler({
        errorLogger: mockErrorLogger,
      });
      const timeoutError = new MockAnthropicTimeoutError();

      const result = await handler.handleAndLog(timeoutError, 'news-summary');

      expect(result).toBeInstanceOf(AIServiceTimeoutError);
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });

    it('logErrors=falseの場合はログを記録しない', async () => {
      const handler = new AIServiceErrorHandler({
        errorLogger: mockErrorLogger,
        logErrors: false,
      });
      const error = new Error('Test error');

      await handler.handleAndLog(error, 'news-summary');

      expect(mockErrorLogger.logError).not.toHaveBeenCalled();
    });
  });
});
