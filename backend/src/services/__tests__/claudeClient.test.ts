/**
 * Claude APIクライアントのテスト
 *
 * Requirements: 12.5, 10.3
 *
 * Claude APIクライアントの初期化とデフォルトモデル設定のテストを行います。
 * また、トークン使用量の追跡機能のテストも行います。
 */

import {
  getClaudeClient,
  ClaudeClient,
  DEFAULT_MODEL,
  CLAUDE_MODELS,
  resetClaudeClient,
} from '../claudeClient';
import { ApiKeyError } from '../claudeClient';
import {
  getTokenUsageTracker,
  resetTokenUsageTracker,
} from '../tokenUsageTracker';

// Anthropic SDKをモック
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation((options?: { apiKey?: string }) => {
      if (!options?.apiKey) {
        throw new Error('apiKey is required');
      }
      return {
        apiKey: options.apiKey,
        messages: {
          create: jest.fn().mockResolvedValue({
            id: 'msg_test_123',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: 'Test response' }],
            model: 'claude-3-haiku-20240307',
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 10,
              output_tokens: 20,
            },
          }),
        },
      };
    }),
  };
});

describe('ClaudeClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // シングルトンインスタンスをリセット
    resetClaudeClient();
    // トークントラッカーもリセット
    resetTokenUsageTracker();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
    resetClaudeClient();
    resetTokenUsageTracker();
  });

  describe('定数', () => {
    it('デフォルトモデルがHaiku 4.5エイリアスに設定されている', () => {
      expect(DEFAULT_MODEL).toBe('claude-haiku-4-5');
    });

    it('利用可能なモデルが定義されている（エイリアス形式）', () => {
      expect(CLAUDE_MODELS).toHaveProperty('haiku');
      expect(CLAUDE_MODELS).toHaveProperty('sonnet');
      expect(CLAUDE_MODELS.haiku).toBe('claude-haiku-4-5');
      expect(CLAUDE_MODELS.sonnet).toBe('claude-sonnet-4-5');
    });
  });

  describe('getClaudeClient', () => {
    it('環境変数が設定されている場合、クライアントを返す', () => {
      process.env.CLAUDE_API_KEY = 'test-api-key';

      const client = getClaudeClient();

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ClaudeClient);
    });

    it('環境変数が設定されていない場合、ApiKeyErrorをスローする', () => {
      delete process.env.CLAUDE_API_KEY;

      expect(() => getClaudeClient()).toThrow(ApiKeyError);
      expect(() => getClaudeClient()).toThrow(
        'CLAUDE_API_KEY環境変数が設定されていません'
      );
    });

    it('シングルトンパターンで同じインスタンスを返す', () => {
      process.env.CLAUDE_API_KEY = 'test-api-key';

      const client1 = getClaudeClient();
      const client2 = getClaudeClient();

      expect(client1).toBe(client2);
    });
  });

  describe('ClaudeClient', () => {
    let client: ClaudeClient;

    beforeEach(() => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      client = getClaudeClient();
    });

    describe('getDefaultModel', () => {
      it('デフォルトモデル（Haiku 4.5エイリアス）を返す', () => {
        expect(client.getDefaultModel()).toBe('claude-haiku-4-5');
      });
    });

    describe('isInitialized', () => {
      it('初期化済みの場合trueを返す', () => {
        expect(client.isInitialized()).toBe(true);
      });
    });

    describe('sendMessage', () => {
      it('メッセージを送信し、レスポンスを返す', async () => {
        const response = await client.sendMessage('Hello, Claude!');

        expect(response).toBeDefined();
        expect(response.content).toBe('Test response');
        expect(response.usage).toEqual({
          inputTokens: 10,
          outputTokens: 20,
        });
      });

      it('カスタムモデルを指定できる', async () => {
        const response = await client.sendMessage('Hello!', {
          model: CLAUDE_MODELS.sonnet,
        });

        expect(response).toBeDefined();
      });

      it('maxTokensを指定できる', async () => {
        const response = await client.sendMessage('Hello!', {
          maxTokens: 500,
        });

        expect(response).toBeDefined();
      });

      it('temperatureを指定できる', async () => {
        const response = await client.sendMessage('Hello!', {
          temperature: 0.5,
        });

        expect(response).toBeDefined();
      });

      it('systemプロンプトを指定できる', async () => {
        const response = await client.sendMessage('Hello!', {
          system: 'You are a helpful assistant.',
        });

        expect(response).toBeDefined();
      });

      it('operationを指定するとトークン使用量が記録される', async () => {
        const tracker = getTokenUsageTracker();

        await client.sendMessage('Hello!', {
          operation: 'test-operation',
        });

        const records = tracker.getRecords();
        expect(records).toHaveLength(1);
        expect(records[0].inputTokens).toBe(10);
        expect(records[0].outputTokens).toBe(20);
        expect(records[0].operation).toBe('test-operation');
      });

      it('operationを指定しない場合はトークン使用量が記録されない', async () => {
        const tracker = getTokenUsageTracker();

        await client.sendMessage('Hello!');

        const records = tracker.getRecords();
        expect(records).toHaveLength(0);
      });

      it('複数回呼び出すと累積トークン使用量が記録される', async () => {
        const tracker = getTokenUsageTracker();

        await client.sendMessage('Hello!', { operation: 'op1' });
        await client.sendMessage('World!', { operation: 'op2' });

        const summary = tracker.getSummary();
        expect(summary.totalInputTokens).toBe(20); // 10 + 10
        expect(summary.totalOutputTokens).toBe(40); // 20 + 20
        expect(summary.requestCount).toBe(2);
      });
    });
  });
});
