/**
 * エラーメッセージのテスト
 * Task 2.2: エラーハンドリング共通機能実装
 */

import { getUserErrorMessage, getDetailedErrorMessage } from '../error-messages';
import { ErrorType } from '../types';

describe('Error Messages', () => {
  describe('getUserErrorMessage', () => {
    it('should return correct message for NETWORK error', () => {
      const message = getUserErrorMessage(ErrorType.NETWORK);
      expect(message).toBe(
        'ネットワーク接続に問題が発生しました。インターネット接続を確認してください。'
      );
    });

    it('should return correct message for API error', () => {
      const message = getUserErrorMessage(ErrorType.API);
      expect(message).toBe(
        '外部サービスとの通信に失敗しました。しばらく待ってから再度お試しください。'
      );
    });

    it('should return correct message for DATABASE error', () => {
      const message = getUserErrorMessage(ErrorType.DATABASE);
      expect(message).toBe(
        'データの読み込みまたは保存に失敗しました。しばらく待ってから再度お試しください。'
      );
    });

    it('should return correct message for VALIDATION error', () => {
      const message = getUserErrorMessage(ErrorType.VALIDATION);
      expect(message).toBe('入力内容に誤りがあります。内容を確認してください。');
    });

    it('should return default message for UNKNOWN error', () => {
      const message = getUserErrorMessage(ErrorType.UNKNOWN);
      expect(message).toBe(
        '予期しないエラーが発生しました。問題が続く場合は、しばらく時間をおいてから再度お試しください。'
      );
    });
  });

  describe('getDetailedErrorMessage', () => {
    it('should return correct detailed message for API_RATE_LIMIT', () => {
      const message = getDetailedErrorMessage('API_RATE_LIMIT');
      expect(message).toBe('APIのレート制限に達しました');
    });

    it('should return correct detailed message for DATABASE_WRITE_FAILED', () => {
      const message = getDetailedErrorMessage('DATABASE_WRITE_FAILED');
      expect(message).toBe('データベースへの書き込みに失敗しました');
    });

    it('should return correct detailed message for AI_SUMMARIZATION_FAILED', () => {
      const message = getDetailedErrorMessage('AI_SUMMARIZATION_FAILED');
      expect(message).toBe('ニュースの要約に失敗しました');
    });

    it('should return correct detailed message for BATCH_TIMEOUT', () => {
      const message = getDetailedErrorMessage('BATCH_TIMEOUT');
      expect(message).toBe('バッチ処理がタイムアウトしました');
    });
  });
});
