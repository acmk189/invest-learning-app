/**
 * 用語生成サービステスト
 * Task 5.5: 用語生成失敗時フォールバック処理
 *
 * Requirements: 1.7 (バッチ失敗時エラーログ+リトライ)
 */

import { ClaudeClient, ClaudeResponse } from '../../claudeClient';
import {
  TermGenerationService,
  TermGenerationError,
} from '../termGenerationService';

// ClaudeClientをモック化
jest.mock('../../claudeClient');

/**
 * テスト用のClaudeResponseを生成するヘルパー
 */
function createMockResponse(term: {
  name: string;
  description: string;
  difficulty: string;
}): ClaudeResponse {
  return {
    content: JSON.stringify(term),
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

describe('TermGenerationService', () => {
  let mockClient: jest.Mocked<ClaudeClient>;
  let service: TermGenerationService;

  beforeEach(() => {
    // モッククライアントをセットアップ
    mockClient = {
      sendMessage: jest.fn(),
      getDefaultModel: jest.fn().mockReturnValue('claude-haiku-4-5'),
      isInitialized: jest.fn().mockReturnValue(true),
      getInternalClient: jest.fn(),
    } as unknown as jest.Mocked<ClaudeClient>;

    service = new TermGenerationService(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('デフォルト設定で初期化されること', () => {
      const config = service.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.logErrors).toBe(true);
    });

    it('カスタム設定で初期化できること', () => {
      const customService = new TermGenerationService(mockClient, {
        maxRetries: 5,
        logErrors: false,
      });

      const config = customService.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.logErrors).toBe(false);
    });
  });

  describe('generateTerm', () => {
    it('正常に用語を生成できること', async () => {
      const mockTerm = {
        name: 'PER',
        description: generateDescription(500),
        difficulty: 'beginner',
      };
      mockClient.sendMessage.mockResolvedValue(createMockResponse(mockTerm));

      const result = await service.generateTerm();

      expect(result.term.name).toBe('PER');
      expect(result.term.difficulty).toBe('beginner');
      expect(result.model).toBe('claude-haiku-4-5');
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('難易度を指定して用語を生成できること', async () => {
      const mockTerm = {
        name: 'デリバティブ',
        description: generateDescription(500),
        difficulty: 'advanced',
      };
      mockClient.sendMessage.mockResolvedValue(createMockResponse(mockTerm));

      const result = await service.generateTerm({ difficulty: 'advanced' });

      expect(result.term.difficulty).toBe('advanced');
      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('上級'),
        expect.any(Object)
      );
    });

    it('除外用語を指定して用語を生成できること', async () => {
      const mockTerm = {
        name: 'ROA',
        description: generateDescription(500),
        difficulty: 'intermediate',
      };
      mockClient.sendMessage.mockResolvedValue(createMockResponse(mockTerm));

      const result = await service.generateTerm({
        excludeTerms: ['PER', 'PBR', 'ROE'],
      });

      expect(result.term.name).toBe('ROA');
      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('PER'),
        expect.any(Object)
      );
    });

    it('文字数が範囲外の場合に警告を含むこと', async () => {
      const mockTerm = {
        name: 'PER',
        description: generateDescription(300), // 短すぎる
        difficulty: 'beginner',
      };
      mockClient.sendMessage.mockResolvedValue(createMockResponse(mockTerm));

      const result = await service.generateTerm();

      expect(result.isValid).toBe(false);
      expect(result.warning).toContain('短すぎます');
    });
  });

  describe('リトライ処理', () => {
    it('失敗時にリトライすること', async () => {
      const mockTerm = {
        name: 'PER',
        description: generateDescription(500),
        difficulty: 'beginner',
      };

      // 1回目失敗、2回目成功
      mockClient.sendMessage
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(createMockResponse(mockTerm));

      const result = await service.generateTerm();

      expect(result.term.name).toBe('PER');
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('最大リトライ回数を超えた場合にエラーをスローすること', async () => {
      // 常に失敗
      mockClient.sendMessage.mockRejectedValue(new Error('API error'));

      await expect(service.generateTerm()).rejects.toThrow(TermGenerationError);
      // 初回 + リトライ3回 = 4回
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(4);
    });

    it('TermGenerationErrorに試行回数が含まれること', async () => {
      mockClient.sendMessage.mockRejectedValue(new Error('API error'));

      try {
        await service.generateTerm();
        fail('エラーがスローされるべき');
      } catch (error) {
        expect(error).toBeInstanceOf(TermGenerationError);
        expect((error as TermGenerationError).attempts).toBe(4);
        expect((error as TermGenerationError).operation).toBe('term-generation');
      }
    });

    it('パースエラー時にリトライすること', async () => {
      const mockTerm = {
        name: 'PER',
        description: generateDescription(500),
        difficulty: 'beginner',
      };

      // 1回目不正なJSON、2回目成功
      mockClient.sendMessage
        .mockResolvedValueOnce({
          ...createMockResponse(mockTerm),
          content: 'invalid json',
        })
        .mockResolvedValueOnce(createMockResponse(mockTerm));

      const result = await service.generateTerm();

      expect(result.term.name).toBe('PER');
      expect(mockClient.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーログ', () => {
    it('logErrors=trueの場合、失敗時にコンソールにログ出力すること', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClient.sendMessage.mockRejectedValue(new Error('API error'));

      const logService = new TermGenerationService(mockClient, { logErrors: true });

      await expect(logService.generateTerm()).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('logErrors=falseの場合、ログ出力しないこと', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClient.sendMessage.mockRejectedValue(new Error('API error'));

      const silentService = new TermGenerationService(mockClient, { logErrors: false });

      await expect(silentService.generateTerm()).rejects.toThrow();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('TermGenerationError', () => {
    it('AppErrorを継承していること', async () => {
      mockClient.sendMessage.mockRejectedValue(new Error('API error'));

      try {
        await service.generateTerm();
        fail('エラーがスローされるべき');
      } catch (error) {
        expect(error).toBeInstanceOf(TermGenerationError);
        expect((error as TermGenerationError).name).toBe('TermGenerationError');
        expect((error as TermGenerationError).retryable).toBe(true);
      }
    });
  });
});
