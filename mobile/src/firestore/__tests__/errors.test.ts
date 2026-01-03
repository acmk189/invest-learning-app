/**
 * Firestore エラーハンドリング テスト
 * Task 14.4: Firestoreエラーハンドリングを実装する
 *
 * Requirements: 7.5, 8.5
 */

import {
  FirestoreError,
  FirestoreErrorCode,
  ERROR_MESSAGES,
  toFirestoreError,
  getUserFriendlyMessage,
  logFirestoreError,
  isOfflineError,
} from '../errors';

describe('FirestoreError', () => {
  describe('constructor', () => {
    it('正しくエラーを作成できること', () => {
      const error = new FirestoreError(
        'CONNECTION_FAILED',
        'Connection failed',
        undefined,
        true
      );

      expect(error.code).toBe('CONNECTION_FAILED');
      expect(error.message).toBe('Connection failed');
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('FirestoreError');
    });

    it('元のエラーを保持できること', () => {
      const originalError = new Error('Original error');
      const error = new FirestoreError(
        'UNKNOWN',
        'Unknown error',
        originalError,
        false
      );

      expect(error.originalError).toBe(originalError);
    });

    it('Errorクラスを継承していること', () => {
      const error = new FirestoreError('TIMEOUT', 'Timeout', undefined, true);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof FirestoreError).toBe(true);
    });
  });
});

describe('ERROR_MESSAGES', () => {
  it('すべてのエラーコードに対応するメッセージが存在すること', () => {
    const errorCodes: FirestoreErrorCode[] = [
      'CONNECTION_FAILED',
      'TIMEOUT',
      'NOT_FOUND',
      'PERMISSION_DENIED',
      'UNAVAILABLE',
      'CANCELLED',
      'UNKNOWN',
    ];

    errorCodes.forEach((code) => {
      expect(ERROR_MESSAGES[code]).toBeDefined();
      expect(typeof ERROR_MESSAGES[code]).toBe('string');
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    });
  });

  it('エラーメッセージが日本語であること', () => {
    // 日本語文字が含まれていることを確認
    expect(ERROR_MESSAGES.CONNECTION_FAILED).toMatch(/[ぁ-んァ-ン]/);
    expect(ERROR_MESSAGES.TIMEOUT).toMatch(/[ぁ-んァ-ン]/);
  });
});

describe('toFirestoreError', () => {
  it('FirestoreErrorをそのまま返すこと', () => {
    const originalError = new FirestoreError(
      'TIMEOUT',
      'Timeout',
      undefined,
      true
    );
    const result = toFirestoreError(originalError);

    expect(result).toBe(originalError);
  });

  it('Firebaseエラーコード(unavailable)を正しく変換すること', () => {
    const firebaseError = new Error('Firebase unavailable') as Error & { code: string };
    firebaseError.code = 'unavailable';

    const result = toFirestoreError(firebaseError);

    expect(result.code).toBe('UNAVAILABLE');
    expect(result.retryable).toBe(true);
  });

  it('Firebaseエラーコード(permission-denied)を正しく変換すること', () => {
    const firebaseError = new Error('Permission denied') as Error & { code: string };
    firebaseError.code = 'permission-denied';

    const result = toFirestoreError(firebaseError);

    expect(result.code).toBe('PERMISSION_DENIED');
    expect(result.retryable).toBe(false);
  });

  it('Firebaseエラーコード(deadline-exceeded)を正しく変換すること', () => {
    const firebaseError = new Error('Deadline exceeded') as Error & { code: string };
    firebaseError.code = 'deadline-exceeded';

    const result = toFirestoreError(firebaseError);

    expect(result.code).toBe('TIMEOUT');
    expect(result.retryable).toBe(true);
  });

  it('タイムアウトメッセージを含むエラーを正しく変換すること', () => {
    const error = new Error('Request timeout occurred');
    const result = toFirestoreError(error);

    expect(result.code).toBe('TIMEOUT');
    expect(result.retryable).toBe(true);
  });

  it('ネットワークメッセージを含むエラーを正しく変換すること', () => {
    const error = new Error('Network connection failed');
    const result = toFirestoreError(error);

    expect(result.code).toBe('CONNECTION_FAILED');
    expect(result.retryable).toBe(true);
  });

  it('不明なエラーをUNKNOWNとして変換すること', () => {
    const error = new Error('Some random error');
    const result = toFirestoreError(error);

    expect(result.code).toBe('UNKNOWN');
    expect(result.retryable).toBe(false);
  });

  it('文字列をエラーに変換できること', () => {
    const result = toFirestoreError('String error');

    expect(result.code).toBe('UNKNOWN');
    expect(result.originalError?.message).toBe('String error');
  });
});

describe('getUserFriendlyMessage', () => {
  it('エラーコードに対応するメッセージを返すこと', () => {
    const error = new FirestoreError(
      'CONNECTION_FAILED',
      'Internal message',
      undefined,
      true
    );
    const message = getUserFriendlyMessage(error);

    expect(message).toBe(ERROR_MESSAGES.CONNECTION_FAILED);
  });

  it('不明なコードに対してUNKNOWNメッセージを返すこと', () => {
    const error = new FirestoreError(
      'UNKNOWN',
      'Unknown',
      undefined,
      false
    );
    const message = getUserFriendlyMessage(error);

    expect(message).toBe(ERROR_MESSAGES.UNKNOWN);
  });
});

describe('logFirestoreError', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('エラー情報をログに出力すること', () => {
    const error = new FirestoreError(
      'CONNECTION_FAILED',
      'Connection failed',
      new Error('Original'),
      true
    );

    logFirestoreError(error, 'fetchNews');

    expect(console.error).toHaveBeenCalledWith(
      '[Firestore Error] fetchNews:',
      expect.objectContaining({
        code: 'CONNECTION_FAILED',
        message: 'Connection failed',
        retryable: true,
        originalError: 'Original',
      })
    );
  });
});

describe('isOfflineError', () => {
  it('CONNECTION_FAILEDをオフラインエラーとして判定すること', () => {
    const error = new FirestoreError(
      'CONNECTION_FAILED',
      'Connection failed',
      undefined,
      true
    );

    expect(isOfflineError(error)).toBe(true);
  });

  it('UNAVAILABLEをオフラインエラーとして判定すること', () => {
    const error = new FirestoreError(
      'UNAVAILABLE',
      'Unavailable',
      undefined,
      true
    );

    expect(isOfflineError(error)).toBe(true);
  });

  it('TIMEOUTをオフラインエラーとして判定しないこと', () => {
    const error = new FirestoreError('TIMEOUT', 'Timeout', undefined, true);

    expect(isOfflineError(error)).toBe(false);
  });

  it('NOT_FOUNDをオフラインエラーとして判定しないこと', () => {
    const error = new FirestoreError('NOT_FOUND', 'Not found', undefined, false);

    expect(isOfflineError(error)).toBe(false);
  });
});
