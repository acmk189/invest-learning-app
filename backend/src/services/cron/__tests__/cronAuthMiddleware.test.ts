/**
 * Cron認証ミドルウェアのテスト
 *
 * Task 13.2: CRON_SECRET認証機構
 *
 * CRON_SECRET環境変数を使用した認証機構のテスト
 * Vercel Cron Jobsからの正規リクエストのみを許可する
 *
 * Requirements:
 * - 9.1 (CRON_SECRET環境変数による認証)
 */

import { VercelRequest } from '@vercel/node';
import {
  validateCronSecret,
  generateCronSecret,
  CRON_SECRET_LENGTH,
} from '../cronAuthMiddleware';

describe('cronAuthMiddleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * モックリクエストを作成するヘルパー関数
   */
  function createMockRequest(authHeader?: string): Partial<VercelRequest> {
    return {
      headers: authHeader ? { authorization: authHeader } : {},
    };
  }

  describe('validateCronSecret', () => {
    describe('正常系', () => {
      it('正しいCRON_SECRETで認証成功', () => {
        const secret = 'test-secret-123';
        process.env.CRON_SECRET = secret;

        const req = createMockRequest(`Bearer ${secret}`);
        const result = validateCronSecret(req as VercelRequest);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('長いCRON_SECRETでも認証成功', () => {
        const secret = 'a'.repeat(64);
        process.env.CRON_SECRET = secret;

        const req = createMockRequest(`Bearer ${secret}`);
        const result = validateCronSecret(req as VercelRequest);

        expect(result.isValid).toBe(true);
      });
    });

    describe('異常系', () => {
      it('CRON_SECRETが未設定の場合は認証失敗', () => {
        delete process.env.CRON_SECRET;

        const req = createMockRequest('Bearer any-token');
        const result = validateCronSecret(req as VercelRequest);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('CRON_SECRET is not configured');
        expect(result.errorCode).toBe('MISSING_CONFIG');
      });

      it('Authorizationヘッダーがない場合は認証失敗', () => {
        process.env.CRON_SECRET = 'test-secret';

        const req = createMockRequest();
        const result = validateCronSecret(req as VercelRequest);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Missing Authorization header');
        expect(result.errorCode).toBe('MISSING_HEADER');
      });

      it('Bearerプレフィックスがない場合は認証失敗', () => {
        process.env.CRON_SECRET = 'test-secret';

        const req = createMockRequest('test-secret');
        const result = validateCronSecret(req as VercelRequest);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid Authorization header format');
        expect(result.errorCode).toBe('INVALID_FORMAT');
      });

      it('トークンが一致しない場合は認証失敗', () => {
        process.env.CRON_SECRET = 'correct-secret';

        const req = createMockRequest('Bearer wrong-secret');
        const result = validateCronSecret(req as VercelRequest);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid CRON_SECRET');
        expect(result.errorCode).toBe('INVALID_SECRET');
      });

      it('空のトークンの場合は認証失敗', () => {
        process.env.CRON_SECRET = 'test-secret';

        const req = createMockRequest('Bearer ');
        const result = validateCronSecret(req as VercelRequest);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid CRON_SECRET');
        expect(result.errorCode).toBe('INVALID_SECRET');
      });

      it('Basic認証形式の場合は認証失敗', () => {
        process.env.CRON_SECRET = 'test-secret';

        const req = createMockRequest('Basic dGVzdDp0ZXN0');
        const result = validateCronSecret(req as VercelRequest);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid Authorization header format');
        expect(result.errorCode).toBe('INVALID_FORMAT');
      });
    });
  });

  describe('generateCronSecret', () => {
    it('指定された長さのシークレットを生成', () => {
      const secret = generateCronSecret(32);
      expect(secret).toHaveLength(64); // hex encoding doubles the length
    });

    it('デフォルト長のシークレットを生成', () => {
      const secret = generateCronSecret();
      expect(secret).toHaveLength(CRON_SECRET_LENGTH * 2); // hex encoding
    });

    it('生成されるシークレットはユニーク', () => {
      const secret1 = generateCronSecret();
      const secret2 = generateCronSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('生成されるシークレットは英数字のみ', () => {
      const secret = generateCronSecret();
      expect(secret).toMatch(/^[a-f0-9]+$/);
    });
  });
});
