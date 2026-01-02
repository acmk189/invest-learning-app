/**
 * 用語部分成功ハンドラーテスト
 *
 * Task 12.3: 用語部分成功検出・ハンドリング
 *
 * 一部の用語のみ生成成功した場合の検出とハンドリングをテスト
 *
 * Requirements:
 * - 8.2 (98%以上バッチ成功率)
 */

import {
  TermsPartialSuccessHandler,
  TermsPartialSuccessType,
} from '../termsBatchPartialSuccessHandler';
import { TermsBatchResult } from '../termsBatchService';
import { Term, TermDifficulty } from '../../../../models/terms.model';

describe('TermsPartialSuccessHandler', () => {
  let handler: TermsPartialSuccessHandler;

  // テスト用のモック用語を作成するヘルパー関数
  const createMockTerm = (
    name: string,
    difficulty: TermDifficulty
  ): Term => ({
    name,
    description: `${name}の解説文です。`.padEnd(400, '。'),
    difficulty,
  });

  // テスト用のモック結果を作成するヘルパー関数
  const createMockResult = (
    terms: Term[] = [],
    overrides: Partial<TermsBatchResult> = {}
  ): TermsBatchResult => ({
    success: terms.length === 3,
    partialSuccess: terms.length > 0 && terms.length < 3,
    terms,
    firestoreSaved: false,
    historyUpdated: false,
    metadataUpdated: false,
    processingTimeMs: 100,
    date: '2026-01-03',
    errors: [],
    ...overrides,
  });

  beforeEach(() => {
    handler = new TermsPartialSuccessHandler();
  });

  describe('analyze', () => {
    it('3つの用語が生成された場合、完全成功と判定する', () => {
      const terms = [
        createMockTerm('PER', 'beginner'),
        createMockTerm('ROE', 'intermediate'),
        createMockTerm('デリバティブ', 'advanced'),
      ];
      const result = createMockResult(terms);

      const analysis = handler.analyze(result);

      expect(analysis.isPartialSuccess).toBe(false);
      expect(analysis.type).toBe(TermsPartialSuccessType.FULL_SUCCESS);
      expect(analysis.generatedCount).toBe(3);
      expect(analysis.shouldSave).toBe(true);
      expect(analysis.shouldRetry).toBe(false);
    });

    it('2つの用語が生成された場合、部分成功と判定する', () => {
      const terms = [
        createMockTerm('PER', 'beginner'),
        createMockTerm('ROE', 'intermediate'),
      ];
      const result = createMockResult(terms);

      const analysis = handler.analyze(result);

      expect(analysis.isPartialSuccess).toBe(true);
      expect(analysis.type).toBe(TermsPartialSuccessType.TWO_TERMS);
      expect(analysis.generatedCount).toBe(2);
      expect(analysis.missingCount).toBe(1);
      expect(analysis.shouldSave).toBe(true);
      expect(analysis.shouldRetry).toBe(false);
    });

    it('1つの用語が生成された場合、部分成功と判定する', () => {
      const terms = [createMockTerm('PER', 'beginner')];
      const result = createMockResult(terms);

      const analysis = handler.analyze(result);

      expect(analysis.isPartialSuccess).toBe(true);
      expect(analysis.type).toBe(TermsPartialSuccessType.ONE_TERM);
      expect(analysis.generatedCount).toBe(1);
      expect(analysis.missingCount).toBe(2);
      expect(analysis.shouldSave).toBe(true);
      expect(analysis.shouldRetry).toBe(false);
    });

    it('用語が生成されなかった場合、完全失敗と判定する', () => {
      const result = createMockResult([]);

      const analysis = handler.analyze(result);

      expect(analysis.isPartialSuccess).toBe(false);
      expect(analysis.type).toBe(TermsPartialSuccessType.FULL_FAILURE);
      expect(analysis.generatedCount).toBe(0);
      expect(analysis.missingCount).toBe(3);
      expect(analysis.shouldSave).toBe(false);
      expect(analysis.shouldRetry).toBe(true);
    });

    it('エラー情報を正しく抽出する', () => {
      const result = createMockResult([], {
        errors: [
          {
            type: 'term-generation-beginner',
            message: '初級用語生成失敗',
            timestamp: new Date(),
          },
          {
            type: 'term-generation-intermediate',
            message: '中級用語生成失敗',
            timestamp: new Date(),
          },
        ],
      });

      const analysis = handler.analyze(result);

      expect(analysis.failureReasons).toHaveLength(2);
      expect(analysis.failureReasons).toContain('初級用語生成失敗');
      expect(analysis.failureReasons).toContain('中級用語生成失敗');
    });

    it('生成された用語の難易度を正しく識別する', () => {
      const terms = [
        createMockTerm('PER', 'beginner'),
        createMockTerm('デリバティブ', 'advanced'),
      ];
      const result = createMockResult(terms);

      const analysis = handler.analyze(result);

      expect(analysis.generatedDifficulties).toContain('beginner');
      expect(analysis.generatedDifficulties).toContain('advanced');
      expect(analysis.generatedDifficulties).not.toContain('intermediate');
      expect(analysis.missingDifficulties).toContain('intermediate');
    });
  });

  describe('createNotification', () => {
    it('完全成功の通知を作成する', () => {
      const terms = [
        createMockTerm('PER', 'beginner'),
        createMockTerm('ROE', 'intermediate'),
        createMockTerm('デリバティブ', 'advanced'),
      ];
      const result = createMockResult(terms);
      const analysis = handler.analyze(result);

      const notification = handler.createNotification(analysis, '2026-01-03');

      expect(notification.severity).toBe('info');
      expect(notification.title).toContain('成功');
    });

    it('部分成功の通知を作成する', () => {
      const terms = [createMockTerm('PER', 'beginner')];
      const result = createMockResult(terms);
      const analysis = handler.analyze(result);

      const notification = handler.createNotification(analysis, '2026-01-03');

      expect(notification.severity).toBe('warning');
      expect(notification.title).toContain('部分成功');
    });

    it('完全失敗の通知を作成する', () => {
      const result = createMockResult([]);
      const analysis = handler.analyze(result);

      const notification = handler.createNotification(analysis, '2026-01-03');

      expect(notification.severity).toBe('error');
      expect(notification.title).toContain('失敗');
    });
  });

  describe('logPartialSuccess', () => {
    it('部分成功時にログを出力する', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const terms = [createMockTerm('PER', 'beginner')];
      const result = createMockResult(terms);

      handler.logPartialSuccess(result);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('完全成功時はログを出力しない', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const terms = [
        createMockTerm('PER', 'beginner'),
        createMockTerm('ROE', 'intermediate'),
        createMockTerm('デリバティブ', 'advanced'),
      ];
      const result = createMockResult(terms);

      handler.logPartialSuccess(result);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
