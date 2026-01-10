/**
 * 用語レスポンスパーサーテスト
 * Task 5.3, 5.4: 用語レスポンスパース機能、用語文字数検証機能
 *
 * Requirements: 4.1 (用語生成), 4.2 (約500文字解説)
 */

import { ClaudeResponse } from '../../claudeClient';
import {
  parseTermResponse,
  validateTermDescription,
} from '../termResponseParser';

/**
 * テスト用のClaudeResponseを生成するヘルパー
 */
function createMockResponse(content: string): ClaudeResponse {
  return {
    content,
    usage: {
      inputTokens: 100,
      outputTokens: 200,
    },
    model: 'claude-haiku-4-5',
    stopReason: 'end_turn',
  };
}

/**
 * 指定した文字数の説明文を生成するヘルパー
 */
function generateDescription(length: number): string {
  return 'あ'.repeat(length);
}

describe('termResponseParser', () => {
  describe('parseTermResponse', () => {
    it('正しいJSON形式のレスポンスをパースできること', () => {
      const json = JSON.stringify({
        name: 'PER',
        description: generateDescription(500),
        difficulty: 'beginner',
      });
      const response = createMockResponse(json);

      const result = parseTermResponse(response);

      expect(result.success).toBe(true);
      expect(result.term).toBeDefined();
      expect(result.term?.name).toBe('PER');
      expect(result.term?.difficulty).toBe('beginner');
    });

    it('コードブロック付きJSONをパースできること', () => {
      const json = `\`\`\`json
{
  "name": "ROE",
  "description": "${generateDescription(500)}",
  "difficulty": "intermediate"
}
\`\`\``;
      const response = createMockResponse(json);

      const result = parseTermResponse(response);

      expect(result.success).toBe(true);
      expect(result.term?.name).toBe('ROE');
      expect(result.term?.difficulty).toBe('intermediate');
    });

    it('不正なJSONでエラーを返すこと', () => {
      const response = createMockResponse('これはJSONではありません');

      const result = parseTermResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.term).toBeUndefined();
    });

    it('必須フィールドが欠けている場合エラーを返すこと', () => {
      const json = JSON.stringify({
        name: 'PER',
        // descriptionが欠けている
        difficulty: 'beginner',
      });
      const response = createMockResponse(json);

      const result = parseTermResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toContain('description');
    });

    it('無効な難易度の場合エラーを返すこと', () => {
      const json = JSON.stringify({
        name: 'PER',
        description: generateDescription(500),
        difficulty: 'expert', // 無効な難易度
      });
      const response = createMockResponse(json);

      const result = parseTermResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toContain('difficulty');
    });

    it('トークン使用量を正しく記録すること', () => {
      const json = JSON.stringify({
        name: 'PBR',
        description: generateDescription(500),
        difficulty: 'advanced',
      });
      const response = createMockResponse(json);

      const result = parseTermResponse(response);

      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(200);
      expect(result.model).toBe('claude-haiku-4-5');
    });

    it('空のコンテンツでエラーを返すこと', () => {
      const response = createMockResponse('');

      const result = parseTermResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('用語名が空の場合エラーを返すこと', () => {
      const json = JSON.stringify({
        name: '',
        description: generateDescription(500),
        difficulty: 'beginner',
      });
      const response = createMockResponse(json);

      const result = parseTermResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });
  });

  describe('validateTermDescription', () => {
    it('許容範囲内(400〜600文字)の場合は有効であること', () => {
      const description = generateDescription(500);

      const result = validateTermDescription(description);

      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(500);
      expect(result.warning).toBeUndefined();
    });

    it('最小文字数(400文字)丁度の場合は有効であること', () => {
      const description = generateDescription(400);

      const result = validateTermDescription(description);

      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(400);
    });

    it('最大文字数(600文字)丁度の場合は有効であること', () => {
      const description = generateDescription(600);

      const result = validateTermDescription(description);

      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(600);
    });

    it('最小文字数未満(399文字以下)の場合は無効であること', () => {
      const description = generateDescription(399);

      const result = validateTermDescription(description);

      expect(result.isValid).toBe(false);
      expect(result.characterCount).toBe(399);
      expect(result.warning).toContain('短すぎます');
    });

    it('最大文字数超過(601文字以上)の場合は無効であること', () => {
      const description = generateDescription(601);

      const result = validateTermDescription(description);

      expect(result.isValid).toBe(false);
      expect(result.characterCount).toBe(601);
      expect(result.warning).toContain('長すぎます');
    });

    it('空の解説文の場合は無効であること', () => {
      const result = validateTermDescription('');

      expect(result.isValid).toBe(false);
      expect(result.characterCount).toBe(0);
      expect(result.warning).toContain('空');
    });

    it('空白のみの解説文の場合は無効であること', () => {
      const result = validateTermDescription('   \n\t  ');

      expect(result.isValid).toBe(false);
      expect(result.characterCount).toBe(0);
    });

    it('空白・改行を除いた文字数をカウントすること', () => {
      // 500文字 + 空白と改行
      const baseText = generateDescription(500);
      const descriptionWithWhitespace = `  ${baseText}  \n\n  `;

      const result = validateTermDescription(descriptionWithWhitespace);

      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(500);
    });
  });
});
