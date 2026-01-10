/**
 * レート制限ハンドラーのテスト
 * Task 3.4: レート制限ハンドリング
 *
 * TDD: REDフェーズ - 実装前にテストを作成
 */

import {
  RateLimitError,
  isRateLimitError,
  extractRetryAfter,
  RateLimitRetryHandler,
  RateLimitConfig,
} from '../rateLimitHandler';

// Anthropic SDKのエラー形式をモック
// 参考: https://docs.anthropic.com/en/api/rate-limits
class MockAnthropicRateLimitError extends Error {
  status: number;
  headers: Record<string, string>;

  constructor(retryAfter?: string) {
    super('rate_limit_error: Number of request tokens has exceeded your daily rate limit');
    this.name = 'RateLimitError';
    this.status = 429;
    this.headers = retryAfter ? { 'retry-after': retryAfter } : {};
  }
}

describe('RateLimitError', () => {
  describe('コンストラクタ', () => {
    it('正しいプロパティでインスタンスを作成できる', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.retryAfterSeconds).toBe(60);
      expect(error.name).toBe('RateLimitError');
    });

    it('retryAfterSecondsがundefinedの場合も作成できる', () => {
      const error = new RateLimitError('Rate limit exceeded');

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.retryAfterSeconds).toBeUndefined();
    });

    it('originalErrorを保持できる', () => {
      const originalError = new Error('Original error');
      const error = new RateLimitError('Rate limit exceeded', 60, originalError);

      expect(error.originalError).toBe(originalError);
    });

    it('retryableがtrueに設定されている', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);

      expect(error.retryable).toBe(true);
    });
  });
});

describe('isRateLimitError', () => {
  describe('レート制限エラーの検出', () => {
    it('Anthropic SDKのRateLimitErrorを検出できる(status 429)', () => {
      const error = new MockAnthropicRateLimitError();

      expect(isRateLimitError(error)).toBe(true);
    });

    it('name が "RateLimitError" のエラーを検出できる', () => {
      const error = new Error('Rate limit');
      error.name = 'RateLimitError';

      expect(isRateLimitError(error)).toBe(true);
    });

    it('status 429 のエラーを検出できる', () => {
      const error = { status: 429, message: 'Too many requests' } as Error & {
        status: number;
      };

      expect(isRateLimitError(error)).toBe(true);
    });

    it('statusCode 429 のエラーを検出できる', () => {
      const error = { statusCode: 429, message: 'Too many requests' } as Error & {
        statusCode: number;
      };

      expect(isRateLimitError(error)).toBe(true);
    });

    it('通常のエラーはfalseを返す', () => {
      const error = new Error('Some other error');

      expect(isRateLimitError(error)).toBe(false);
    });

    it('status 500 のエラーはfalseを返す', () => {
      const error = { status: 500, message: 'Server error' } as Error & {
        status: number;
      };

      expect(isRateLimitError(error)).toBe(false);
    });
  });
});

describe('extractRetryAfter', () => {
  describe('retry-after値の抽出', () => {
    it('headersからretry-after値を秒数として抽出できる', () => {
      const error = new MockAnthropicRateLimitError('60');

      expect(extractRetryAfter(error)).toBe(60);
    });

    it('retry-afterがない場合はundefinedを返す', () => {
      const error = new MockAnthropicRateLimitError();

      expect(extractRetryAfter(error)).toBeUndefined();
    });

    it('headersがないエラーの場合はundefinedを返す', () => {
      const error = new Error('Rate limit');

      expect(extractRetryAfter(error)).toBeUndefined();
    });

    it('小数点を含むretry-afterを整数に切り上げる', () => {
      const error = new MockAnthropicRateLimitError('45.5');

      expect(extractRetryAfter(error)).toBe(46);
    });

    it('不正なretry-after値の場合はundefinedを返す', () => {
      const error = new MockAnthropicRateLimitError('invalid');

      expect(extractRetryAfter(error)).toBeUndefined();
    });
  });
});

describe('RateLimitRetryHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('コンストラクタ', () => {
    it('デフォルト設定でインスタンスを作成できる', () => {
      const handler = new RateLimitRetryHandler();

      expect(handler.getConfig().maxRetries).toBe(3);
      expect(handler.getConfig().defaultWaitSeconds).toBe(60);
      expect(handler.getConfig().maxWaitSeconds).toBe(300);
    });

    it('カスタム設定でインスタンスを作成できる', () => {
      const config: RateLimitConfig = {
        maxRetries: 5,
        defaultWaitSeconds: 30,
        maxWaitSeconds: 120,
      };
      const handler = new RateLimitRetryHandler(config);

      expect(handler.getConfig().maxRetries).toBe(5);
      expect(handler.getConfig().defaultWaitSeconds).toBe(30);
      expect(handler.getConfig().maxWaitSeconds).toBe(120);
    });
  });

  describe('executeWithRateLimitHandling', () => {
    it('成功した場合は結果を返す', async () => {
      const handler = new RateLimitRetryHandler();
      const fn = jest.fn().mockResolvedValue('success');

      const result = await handler.executeWithRateLimitHandling(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('レート制限エラー後にリトライして成功する', async () => {
      const handler = new RateLimitRetryHandler({ defaultWaitSeconds: 1 });
      const rateLimitError = new MockAnthropicRateLimitError('1');
      const fn = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success');

      const resultPromise = handler.executeWithRateLimitHandling(fn);

      // 待機時間をスキップ
      await jest.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retry-afterヘッダーの値を使用して待機する', async () => {
      const handler = new RateLimitRetryHandler();
      const onRetry = jest.fn();
      const rateLimitError = new MockAnthropicRateLimitError('30');
      const fn = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success');

      const resultPromise = handler.executeWithRateLimitHandling(fn, { onRetry });

      // 30秒待機
      await jest.advanceTimersByTimeAsync(30000);

      await resultPromise;

      expect(onRetry).toHaveBeenCalledWith(expect.any(RateLimitError), 1, 30);
    });

    it('最大リトライ回数を超えるとエラーをスローする', async () => {
      const handler = new RateLimitRetryHandler({
        maxRetries: 2,
        defaultWaitSeconds: 1,
      });
      const rateLimitError = new MockAnthropicRateLimitError('1');
      const fn = jest.fn().mockRejectedValue(rateLimitError);

      // Promise実行とタイマー進行を交互に行う
      let caughtError: Error | null = null;
      const resultPromise = handler
        .executeWithRateLimitHandling(fn)
        .catch((e) => {
          caughtError = e;
        });

      // 全てのリトライの待機時間をスキップ
      for (let i = 0; i < 3; i++) {
        await jest.advanceTimersByTimeAsync(1000);
      }

      await resultPromise;

      expect(caughtError).toBeInstanceOf(RateLimitError);
      expect((caughtError as unknown as RateLimitError).message).toContain(
        'Rate limit exceeded after 2 retries'
      );
      expect(fn).toHaveBeenCalledTimes(3); // 初回 + 2回リトライ
    });

    it('レート制限エラー以外はそのままスローする', async () => {
      const handler = new RateLimitRetryHandler();
      const normalError = new Error('Other error');
      const fn = jest.fn().mockRejectedValue(normalError);

      await expect(handler.executeWithRateLimitHandling(fn)).rejects.toThrow(
        'Other error'
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('最大待機時間を超えない', async () => {
      const handler = new RateLimitRetryHandler({
        maxWaitSeconds: 60,
      });
      const onRetry = jest.fn();
      // retry-afterが120秒の場合でも、maxWaitSecondsの60秒で制限される
      const rateLimitError = new MockAnthropicRateLimitError('120');
      const fn = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success');

      const resultPromise = handler.executeWithRateLimitHandling(fn, { onRetry });

      // 60秒(maxWaitSeconds)待機
      await jest.advanceTimersByTimeAsync(60000);

      await resultPromise;

      expect(onRetry).toHaveBeenCalledWith(expect.any(RateLimitError), 1, 60);
    });

    it('onRetryコールバックが呼び出される', async () => {
      const handler = new RateLimitRetryHandler({ defaultWaitSeconds: 1 });
      const onRetry = jest.fn();
      const rateLimitError = new MockAnthropicRateLimitError('1');
      const fn = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success');

      const resultPromise = handler.executeWithRateLimitHandling(fn, { onRetry });

      await jest.advanceTimersByTimeAsync(1000);

      await resultPromise;

      expect(onRetry).toHaveBeenCalledWith(expect.any(RateLimitError), 1, 1);
    });
  });

  describe('wrapWithRateLimitHandling', () => {
    it('関数をラップしてレート制限ハンドリングを適用する', async () => {
      const handler = new RateLimitRetryHandler({ defaultWaitSeconds: 1 });
      const rateLimitError = new MockAnthropicRateLimitError('1');
      const fn = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('wrapped success');

      const wrappedFn = handler.wrapWithRateLimitHandling(fn);

      const resultPromise = wrappedFn();

      await jest.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result).toBe('wrapped success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
