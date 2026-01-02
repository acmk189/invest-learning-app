/**
 * 重複チェックエラーハンドリングテスト
 * Task 10.4: 重複チェックエラーハンドリング
 *
 * 重複チェック処理中に発生するエラーを適切に
 * ハンドリングする機能をテストします。
 *
 * Requirements: 8.5 (外部API障害時エラーハンドリング+ログ)
 */

import { Firestore } from 'firebase-admin/firestore';
import {
  DuplicateCheckError,
  DuplicateCheckErrorType,
  DuplicateCheckErrorHandler,
  isDuplicateCheckError,
} from '../duplicateCheckErrorHandler';
import { ErrorLogger } from '../../../../errors/error-logger';
import { ErrorType, ErrorSeverity } from '../../../../errors/types';

// Firestoreモック
const mockFirestore = {
  collection: jest.fn(),
} as unknown as Firestore;

// ErrorLoggerモック
const mockLogError = jest.fn();
const mockErrorLogger = {
  logError: mockLogError,
  logErrorWithContext: jest.fn(),
} as unknown as ErrorLogger;

describe('DuplicateCheckError', () => {
  describe('コンストラクタ', () => {
    it('正しいプロパティを設定できる', () => {
      const error = new DuplicateCheckError(
        'テストエラー',
        DuplicateCheckErrorType.HISTORY_FETCH_FAILED
      );

      expect(error.message).toBe('テストエラー');
      expect(error.duplicateCheckErrorType).toBe(DuplicateCheckErrorType.HISTORY_FETCH_FAILED);
      expect(error.type).toBe(ErrorType.FIRESTORE);
      expect(error.name).toBe('DuplicateCheckError');
    });

    it('元のエラーを保持できる', () => {
      const originalError = new Error('原因エラー');
      const error = new DuplicateCheckError(
        'テストエラー',
        DuplicateCheckErrorType.HISTORY_FETCH_FAILED,
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });

    it('追加コンテキストを保持できる', () => {
      const context = { operation: 'fetch', days: 30 };
      const error = new DuplicateCheckError(
        'テストエラー',
        DuplicateCheckErrorType.HISTORY_FETCH_FAILED,
        undefined,
        context
      );

      expect(error.context).toEqual(context);
    });
  });

  describe('エラータイプ別の検証', () => {
    it('HISTORY_FETCH_FAILEDタイプのエラーを作成できる', () => {
      const error = new DuplicateCheckError(
        '履歴取得失敗',
        DuplicateCheckErrorType.HISTORY_FETCH_FAILED
      );

      expect(error.duplicateCheckErrorType).toBe(
        DuplicateCheckErrorType.HISTORY_FETCH_FAILED
      );
      expect(error.retryable).toBe(true); // Firestoreエラーはリトライ可能
    });

    it('DUPLICATE_CHECK_FAILEDタイプのエラーを作成できる', () => {
      const error = new DuplicateCheckError(
        '重複チェック失敗',
        DuplicateCheckErrorType.DUPLICATE_CHECK_FAILED
      );

      expect(error.duplicateCheckErrorType).toBe(
        DuplicateCheckErrorType.DUPLICATE_CHECK_FAILED
      );
    });

    it('REGENERATION_FAILEDタイプのエラーを作成できる', () => {
      const error = new DuplicateCheckError(
        '再生成失敗',
        DuplicateCheckErrorType.REGENERATION_FAILED
      );

      expect(error.duplicateCheckErrorType).toBe(
        DuplicateCheckErrorType.REGENERATION_FAILED
      );
    });

    it('MAX_REGENERATION_EXCEEDEDタイプのエラーを作成できる', () => {
      const error = new DuplicateCheckError(
        '最大再生成回数超過',
        DuplicateCheckErrorType.MAX_REGENERATION_EXCEEDED
      );

      expect(error.duplicateCheckErrorType).toBe(
        DuplicateCheckErrorType.MAX_REGENERATION_EXCEEDED
      );
    });
  });
});

describe('isDuplicateCheckError', () => {
  it('DuplicateCheckErrorの場合はtrueを返す', () => {
    const error = new DuplicateCheckError(
      'テスト',
      DuplicateCheckErrorType.HISTORY_FETCH_FAILED
    );

    expect(isDuplicateCheckError(error)).toBe(true);
  });

  it('通常のErrorの場合はfalseを返す', () => {
    const error = new Error('通常のエラー');

    expect(isDuplicateCheckError(error)).toBe(false);
  });

  it('nullの場合はfalseを返す', () => {
    expect(isDuplicateCheckError(null)).toBe(false);
  });

  it('undefinedの場合はfalseを返す', () => {
    expect(isDuplicateCheckError(undefined)).toBe(false);
  });
});

describe('DuplicateCheckErrorHandler', () => {
  let handler: DuplicateCheckErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new DuplicateCheckErrorHandler(mockErrorLogger);
  });

  describe('handleHistoryFetchError', () => {
    it('履歴取得エラーをハンドリングできる', async () => {
      const originalError = new Error('Firestore接続エラー');

      await handler.handleHistoryFetchError(originalError, { days: 30 });

      // mockLogErrorが呼び出されたことを確認
      expect(mockLogError).toHaveBeenCalledTimes(1);

      // 第1引数: DuplicateCheckErrorオブジェクト
      const errorArg = mockLogError.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(DuplicateCheckError);
      expect(errorArg.message).toContain('履歴');
      expect(errorArg.duplicateCheckErrorType).toBe(DuplicateCheckErrorType.HISTORY_FETCH_FAILED);

      // 第2引数: コンテキスト
      const contextArg = mockLogError.mock.calls[0][1];
      expect(contextArg).toEqual({ days: 30 });
    });

    it('DuplicateCheckErrorを返す', async () => {
      const originalError = new Error('テストエラー');

      const result = await handler.handleHistoryFetchError(originalError, {});

      expect(result).toBeInstanceOf(DuplicateCheckError);
      expect(result.duplicateCheckErrorType).toBe(
        DuplicateCheckErrorType.HISTORY_FETCH_FAILED
      );
    });
  });

  describe('handleDuplicateCheckError', () => {
    it('重複チェックエラーをハンドリングできる', async () => {
      const originalError = new Error('チェックエラー');

      await handler.handleDuplicateCheckError(originalError, {
        termName: 'PER',
      });

      expect(mockLogError).toHaveBeenCalledWith(
        expect.objectContaining({
          duplicateCheckErrorType: DuplicateCheckErrorType.DUPLICATE_CHECK_FAILED,
        }),
        expect.objectContaining({
          termName: 'PER',
        })
      );
    });
  });

  describe('handleRegenerationError', () => {
    it('再生成エラーをハンドリングできる', async () => {
      const originalError = new Error('生成エラー');

      await handler.handleRegenerationError(originalError, {
        attempt: 3,
        maxAttempts: 5,
      });

      expect(mockLogError).toHaveBeenCalledWith(
        expect.objectContaining({
          duplicateCheckErrorType: DuplicateCheckErrorType.REGENERATION_FAILED,
        }),
        expect.objectContaining({
          attempt: 3,
          maxAttempts: 5,
        })
      );
    });
  });

  describe('handleMaxRegenerationExceeded', () => {
    it('最大再生成回数超過をハンドリングできる', async () => {
      await handler.handleMaxRegenerationExceeded({
        maxAttempts: 5,
        duplicatedTerms: ['PER', 'PBR', 'ROE'],
      });

      expect(mockLogError).toHaveBeenCalledWith(
        expect.objectContaining({
          duplicateCheckErrorType: DuplicateCheckErrorType.MAX_REGENERATION_EXCEEDED,
        }),
        expect.objectContaining({
          maxAttempts: 5,
          duplicatedTerms: ['PER', 'PBR', 'ROE'],
        })
      );
    });

    it('DuplicateCheckErrorを返す', async () => {
      const result = await handler.handleMaxRegenerationExceeded({
        maxAttempts: 5,
        duplicatedTerms: [],
      });

      expect(result).toBeInstanceOf(DuplicateCheckError);
      expect(result.duplicateCheckErrorType).toBe(
        DuplicateCheckErrorType.MAX_REGENERATION_EXCEEDED
      );
    });
  });

  describe('createError', () => {
    it('コンテキスト付きのエラーを作成できる', () => {
      const error = handler.createError(
        'カスタムエラー',
        DuplicateCheckErrorType.DUPLICATE_CHECK_FAILED,
        undefined,
        { customKey: 'customValue' }
      );

      expect(error.message).toBe('カスタムエラー');
      expect(error.context).toEqual({ customKey: 'customValue' });
    });
  });

  describe('エラーログ記録失敗時の動作', () => {
    it('ログ記録に失敗してもエラーを返す', async () => {
      mockLogError.mockRejectedValueOnce(new Error('ログ記録失敗'));

      const originalError = new Error('テストエラー');
      const result = await handler.handleHistoryFetchError(originalError, {});

      // ログ記録が失敗してもエラーオブジェクトは返される
      expect(result).toBeInstanceOf(DuplicateCheckError);
    });
  });

  describe('重大度の設定', () => {
    it('HISTORYエラーはHIGH重大度', async () => {
      const originalError = new Error('テスト');
      const result = await handler.handleHistoryFetchError(originalError, {});

      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it('MAX_REGENERATION_EXCEEDEDはCRITICAL重大度', async () => {
      const result = await handler.handleMaxRegenerationExceeded({
        maxAttempts: 5,
        duplicatedTerms: [],
      });

      expect(result.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });
});

describe('エラータイプEnum', () => {
  it('全てのエラータイプが定義されている', () => {
    expect(DuplicateCheckErrorType.HISTORY_FETCH_FAILED).toBeDefined();
    expect(DuplicateCheckErrorType.DUPLICATE_CHECK_FAILED).toBeDefined();
    expect(DuplicateCheckErrorType.REGENERATION_FAILED).toBeDefined();
    expect(DuplicateCheckErrorType.MAX_REGENERATION_EXCEEDED).toBeDefined();
  });
});
