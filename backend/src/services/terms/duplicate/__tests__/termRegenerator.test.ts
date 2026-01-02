/**
 * 再生成リクエスト機能テスト
 * Task 10.3: 再生成リクエスト機能
 *
 * 重複検出時にAIサービスへ再生成リクエストを送信し、
 * ユニークな用語を取得する機能をテストします。
 *
 * Requirements: 4.3 (過去30日以内に配信した用語を除外)
 */

import { TermRegenerator, TermRegenerationResult } from '../termRegenerator';
import { DuplicateChecker, DuplicateCheckMode } from '../duplicateChecker';
import {
  TermGenerationService,
  TermGenerationResult,
} from '../../termGenerationService';
import { Term, TermDifficulty } from '../../../../models/terms.model';

// TermGenerationServiceのモック
const mockGenerateTerm = jest.fn();
const mockTermGenerationService = {
  generateTerm: mockGenerateTerm,
} as unknown as TermGenerationService;

describe('TermRegenerator', () => {
  let regenerator: TermRegenerator;
  let duplicateChecker: DuplicateChecker;

  beforeEach(() => {
    jest.clearAllMocks();

    const deliveredTerms = ['PER', 'PBR', 'ROE'];
    duplicateChecker = new DuplicateChecker(deliveredTerms);

    regenerator = new TermRegenerator(
      mockTermGenerationService,
      duplicateChecker
    );
  });

  describe('generateUniqueTermの基本動作', () => {
    it('最初の生成でユニークな用語が生成された場合はそのまま返す', async () => {
      // Arrange
      const mockResult: TermGenerationResult = {
        term: {
          name: 'EPS',
          description: '一株当たり純利益（EPS: Earnings Per Share）とは...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };
      mockGenerateTerm.mockResolvedValue(mockResult);

      // Act
      const result = await regenerator.generateUniqueTerm({
        difficulty: 'beginner',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.term?.name).toBe('EPS');
      expect(result.attempts).toBe(1);
      expect(result.regeneratedCount).toBe(0);
      expect(mockGenerateTerm).toHaveBeenCalledTimes(1);
    });

    it('重複した用語が生成された場合は再生成する', async () => {
      // Arrange
      const duplicateTerm: TermGenerationResult = {
        term: {
          name: 'PER', // 重複
          description: '株価収益率とは...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      const uniqueTerm: TermGenerationResult = {
        term: {
          name: 'EPS', // ユニーク
          description: '一株当たり純利益とは...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      mockGenerateTerm
        .mockResolvedValueOnce(duplicateTerm)
        .mockResolvedValueOnce(uniqueTerm);

      // Act
      const result = await regenerator.generateUniqueTerm({
        difficulty: 'beginner',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.term?.name).toBe('EPS');
      expect(result.attempts).toBe(2);
      expect(result.regeneratedCount).toBe(1);
      expect(mockGenerateTerm).toHaveBeenCalledTimes(2);
    });

    it('2回連続で重複した後にユニークな用語が生成される', async () => {
      // Arrange
      const duplicate1: TermGenerationResult = {
        term: {
          name: 'PER',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      const duplicate2: TermGenerationResult = {
        term: {
          name: 'PBR',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      const uniqueTerm: TermGenerationResult = {
        term: {
          name: 'BPS',
          description: '一株当たり純資産とは...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      mockGenerateTerm
        .mockResolvedValueOnce(duplicate1)
        .mockResolvedValueOnce(duplicate2)
        .mockResolvedValueOnce(uniqueTerm);

      // Act
      const result = await regenerator.generateUniqueTerm({
        difficulty: 'beginner',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.term?.name).toBe('BPS');
      expect(result.attempts).toBe(3);
      expect(result.regeneratedCount).toBe(2);
    });
  });

  describe('最大再生成回数の制御', () => {
    it('最大再生成回数（デフォルト5回）を超えると失敗する', async () => {
      // Arrange
      const duplicateTerm: TermGenerationResult = {
        term: {
          name: 'PER',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      // 6回全て重複
      mockGenerateTerm.mockResolvedValue(duplicateTerm);

      // Act
      const result = await regenerator.generateUniqueTerm({
        difficulty: 'beginner',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.term).toBeUndefined();
      expect(result.attempts).toBe(6); // 初回 + 5回のリトライ
      expect(result.regeneratedCount).toBe(5);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('最大再生成回数');
    });

    it('カスタムの最大再生成回数を設定できる', async () => {
      // Arrange
      const customRegenerator = new TermRegenerator(
        mockTermGenerationService,
        duplicateChecker,
        { maxRegenerations: 3 }
      );

      const duplicateTerm: TermGenerationResult = {
        term: {
          name: 'PER',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      mockGenerateTerm.mockResolvedValue(duplicateTerm);

      // Act
      const result = await customRegenerator.generateUniqueTerm({
        difficulty: 'beginner',
      });

      // Assert
      expect(result.attempts).toBe(4); // 初回 + 3回のリトライ
      expect(result.regeneratedCount).toBe(3);
    });
  });

  describe('除外用語リストの更新', () => {
    it('再生成時に重複した用語を除外リストに追加する', async () => {
      // Arrange
      const duplicate: TermGenerationResult = {
        term: {
          name: 'PER',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      const uniqueTerm: TermGenerationResult = {
        term: {
          name: 'EPS',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      mockGenerateTerm
        .mockResolvedValueOnce(duplicate)
        .mockResolvedValueOnce(uniqueTerm);

      // Act
      await regenerator.generateUniqueTerm({
        difficulty: 'beginner',
      });

      // Assert - 2回目のgenerateTermの呼び出しを確認
      expect(mockGenerateTerm).toHaveBeenCalledTimes(2);
      const secondCallArgs = mockGenerateTerm.mock.calls[1][0];
      expect(secondCallArgs.excludeTerms).toContain('PER');
    });

    it('既存の除外リストに追加する形で更新する', async () => {
      // Arrange
      const duplicate: TermGenerationResult = {
        term: {
          name: 'EPS',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      const uniqueTerm: TermGenerationResult = {
        term: {
          name: 'BPS',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      // EPSを配信済みに追加
      duplicateChecker.addDeliveredTerm('EPS');

      mockGenerateTerm
        .mockResolvedValueOnce(duplicate)
        .mockResolvedValueOnce(uniqueTerm);

      // Act
      await regenerator.generateUniqueTerm({
        difficulty: 'beginner',
        excludeTerms: ['EXISTING1', 'EXISTING2'],
      });

      // Assert
      const secondCallArgs = mockGenerateTerm.mock.calls[1][0];
      expect(secondCallArgs.excludeTerms).toContain('EXISTING1');
      expect(secondCallArgs.excludeTerms).toContain('EXISTING2');
      expect(secondCallArgs.excludeTerms).toContain('EPS');
    });
  });

  describe('再生成履歴', () => {
    it('再生成履歴を取得できる', async () => {
      // Arrange
      const duplicate1: TermGenerationResult = {
        term: {
          name: 'PER',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      const duplicate2: TermGenerationResult = {
        term: {
          name: 'PBR',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      const uniqueTerm: TermGenerationResult = {
        term: {
          name: 'EPS',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      mockGenerateTerm
        .mockResolvedValueOnce(duplicate1)
        .mockResolvedValueOnce(duplicate2)
        .mockResolvedValueOnce(uniqueTerm);

      // Act
      const result = await regenerator.generateUniqueTerm({
        difficulty: 'beginner',
      });

      // Assert
      expect(result.regenerationHistory).toBeDefined();
      expect(result.regenerationHistory).toHaveLength(2);
      expect(result.regenerationHistory![0].termName).toBe('PER');
      expect(result.regenerationHistory![0].reason).toBe('duplicate');
      expect(result.regenerationHistory![1].termName).toBe('PBR');
      expect(result.regenerationHistory![1].reason).toBe('duplicate');
    });
  });

  describe('ログ出力', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('再生成時にログを出力する', async () => {
      // Arrange
      const regeneratorWithLogging = new TermRegenerator(
        mockTermGenerationService,
        duplicateChecker,
        { enableLogging: true }
      );

      const duplicate: TermGenerationResult = {
        term: {
          name: 'PER',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      const uniqueTerm: TermGenerationResult = {
        term: {
          name: 'EPS',
          description: '...',
          difficulty: 'beginner' as TermDifficulty,
        },
        characterCount: 480,
        isValid: true,
        model: 'claude-3-haiku-20240307',
        inputTokens: 100,
        outputTokens: 200,
      };

      mockGenerateTerm
        .mockResolvedValueOnce(duplicate)
        .mockResolvedValueOnce(uniqueTerm);

      // Act
      await regeneratorWithLogging.generateUniqueTerm({
        difficulty: 'beginner',
      });

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TermRegenerator]')
      );
    });
  });

  describe('設定の取得', () => {
    it('現在の設定を取得できる', () => {
      // Act
      const config = regenerator.getConfig();

      // Assert
      expect(config.maxRegenerations).toBe(5);
      expect(config.enableLogging).toBe(false);
    });

    it('カスタム設定を反映できる', () => {
      // Arrange
      const customRegenerator = new TermRegenerator(
        mockTermGenerationService,
        duplicateChecker,
        {
          maxRegenerations: 10,
          enableLogging: true,
        }
      );

      // Act
      const config = customRegenerator.getConfig();

      // Assert
      expect(config.maxRegenerations).toBe(10);
      expect(config.enableLogging).toBe(true);
    });
  });
});

describe('TermRegenerationResult', () => {
  it('成功結果の構造が正しい', () => {
    const result: TermRegenerationResult = {
      success: true,
      term: {
        name: 'EPS',
        description: '一株当たり純利益とは...',
        difficulty: 'beginner',
      },
      attempts: 1,
      regeneratedCount: 0,
    };

    expect(result.success).toBe(true);
    expect(result.term?.name).toBe('EPS');
    expect(result.attempts).toBe(1);
    expect(result.regeneratedCount).toBe(0);
  });

  it('失敗結果の構造が正しい', () => {
    const result: TermRegenerationResult = {
      success: false,
      attempts: 6,
      regeneratedCount: 5,
      error: '最大再生成回数を超えました',
      regenerationHistory: [
        { termName: 'PER', reason: 'duplicate', attemptNumber: 1 },
        { termName: 'PBR', reason: 'duplicate', attemptNumber: 2 },
      ],
    };

    expect(result.success).toBe(false);
    expect(result.term).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.regenerationHistory).toHaveLength(2);
  });
});
