/**
 * 要約レスポンスパーサーのテスト
 * Task 4.3, 4.4: 要約レスポンスパース機能、要約文字数検証機能
 *
 * Requirements: 1.4
 */

import {
  SummaryParseResult,
  parseSummaryResponse,
  validateSummaryLength,
  SummaryValidationResult,
} from '../summaryResponseParser';
import { ClaudeResponse } from '../../claudeClient';
import { SUMMARY_CONFIG } from '../newsSummaryPrompt';

describe('要約レスポンスパーサー', () => {
  describe('SummaryParseResult型', () => {
    it('パース結果の基本構造を持つ', () => {
      const result: SummaryParseResult = {
        summary: 'テスト要約文',
        characterCount: 6,
        model: 'claude-haiku-4-5',
        inputTokens: 100,
        outputTokens: 50,
      };

      expect(result.summary).toBe('テスト要約文');
      expect(result.characterCount).toBe(6);
      expect(result.model).toBe('claude-haiku-4-5');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
    });
  });

  describe('parseSummaryResponse', () => {
    const createMockResponse = (content: string): ClaudeResponse => ({
      content,
      usage: {
        inputTokens: 500,
        outputTokens: 200,
      },
      model: 'claude-haiku-4-5',
      stopReason: 'end_turn',
    });

    it('ClaudeResponseから要約文を抽出する', () => {
      const response = createMockResponse('これはテスト要約です。');
      const result = parseSummaryResponse(response);

      expect(result.summary).toBe('これはテスト要約です。');
    });

    it('文字数を正確にカウントする', () => {
      const response = createMockResponse('あいうえお');
      const result = parseSummaryResponse(response);

      expect(result.characterCount).toBe(5);
    });

    it('トークン使用量を含む', () => {
      const response = createMockResponse('テスト');
      const result = parseSummaryResponse(response);

      expect(result.inputTokens).toBe(500);
      expect(result.outputTokens).toBe(200);
    });

    it('モデル名を含む', () => {
      const response = createMockResponse('テスト');
      const result = parseSummaryResponse(response);

      expect(result.model).toBe('claude-haiku-4-5');
    });

    it('空のコンテンツも処理できる', () => {
      const response = createMockResponse('');
      const result = parseSummaryResponse(response);

      expect(result.summary).toBe('');
      expect(result.characterCount).toBe(0);
    });

    it('前後の空白をトリムする', () => {
      const response = createMockResponse('  要約テキスト  ');
      const result = parseSummaryResponse(response);

      expect(result.summary).toBe('要約テキスト');
      expect(result.characterCount).toBe(6);
    });

    it('改行を含むテキストも処理できる', () => {
      const response = createMockResponse('見出し\n本文\nまとめ');
      const result = parseSummaryResponse(response);

      expect(result.summary).toBe('見出し\n本文\nまとめ');
      // 改行はカウントしない: 見出し(3) + 本文(2) + まとめ(3) = 8
      expect(result.characterCount).toBe(8);
    });
  });

  describe('validateSummaryLength', () => {
    it('目標範囲内の要約は有効と判定する', () => {
      // 2000文字の要約
      const summary = 'あ'.repeat(2000);
      const result = validateSummaryLength(summary);

      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(2000);
      expect(result.warning).toBeUndefined();
    });

    it('最小文字数（1800文字）ちょうどは有効', () => {
      const summary = 'あ'.repeat(SUMMARY_CONFIG.minCharacters);
      const result = validateSummaryLength(summary);

      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(SUMMARY_CONFIG.minCharacters);
    });

    it('最大文字数（2200文字）ちょうどは有効', () => {
      const summary = 'あ'.repeat(SUMMARY_CONFIG.maxCharacters);
      const result = validateSummaryLength(summary);

      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(SUMMARY_CONFIG.maxCharacters);
    });

    it('最小文字数未満は無効と判定し警告を返す', () => {
      const summary = 'あ'.repeat(SUMMARY_CONFIG.minCharacters - 1);
      const result = validateSummaryLength(summary);

      expect(result.isValid).toBe(false);
      expect(result.characterCount).toBe(SUMMARY_CONFIG.minCharacters - 1);
      expect(result.warning).toBeDefined();
      expect(result.warning).toMatch(/文字/);
    });

    it('最大文字数超過は無効と判定し警告を返す', () => {
      const summary = 'あ'.repeat(SUMMARY_CONFIG.maxCharacters + 1);
      const result = validateSummaryLength(summary);

      expect(result.isValid).toBe(false);
      expect(result.characterCount).toBe(SUMMARY_CONFIG.maxCharacters + 1);
      expect(result.warning).toBeDefined();
      expect(result.warning).toMatch(/文字/);
    });

    it('空の要約は無効と判定する', () => {
      const result = validateSummaryLength('');

      expect(result.isValid).toBe(false);
      expect(result.characterCount).toBe(0);
      expect(result.warning).toBeDefined();
    });

    it('空白のみの要約は無効と判定する', () => {
      const result = validateSummaryLength('   \n\t   ');

      expect(result.isValid).toBe(false);
      expect(result.characterCount).toBe(0);
      expect(result.warning).toBeDefined();
    });

    it('改行や空白を除いた文字数でカウントする', () => {
      // 改行と空白を含む2000文字相当
      const baseText = 'あ'.repeat(2000);
      const summaryWithWhitespace = `  ${baseText}  \n`;
      const result = validateSummaryLength(summaryWithWhitespace);

      expect(result.characterCount).toBe(2000);
      expect(result.isValid).toBe(true);
    });
  });

  describe('SummaryValidationResult型', () => {
    it('検証結果の基本構造を持つ', () => {
      const result: SummaryValidationResult = {
        isValid: true,
        characterCount: 2000,
      };

      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(2000);
      expect(result.warning).toBeUndefined();
    });

    it('警告メッセージを含められる', () => {
      const result: SummaryValidationResult = {
        isValid: false,
        characterCount: 1500,
        warning: '文字数が不足しています',
      };

      expect(result.isValid).toBe(false);
      expect(result.warning).toBe('文字数が不足しています');
    });
  });
});
