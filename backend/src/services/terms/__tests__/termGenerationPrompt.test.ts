/**
 * 用語生成プロンプトテスト
 * Task 5.1, 5.2: 用語生成プロンプト基本実装、難易度指定機能
 *
 * Requirements: 4.1 (1日3つ投資用語生成), 4.2 (各用語に500文字解説生成), 4.4 (難易度混在)
 */

import {
  buildTermGenerationPrompt,
  TERM_GENERATION_CONFIG,
  DifficultyLevel,
  DIFFICULTY_DESCRIPTIONS,
} from '../termGenerationPrompt';

describe('termGenerationPrompt', () => {
  describe('TERM_GENERATION_CONFIG', () => {
    it('目標文字数が500文字であること', () => {
      expect(TERM_GENERATION_CONFIG.targetCharacters).toBe(500);
    });

    it('最小許容文字数が400文字であること', () => {
      expect(TERM_GENERATION_CONFIG.minCharacters).toBe(400);
    });

    it('最大許容文字数が600文字であること', () => {
      expect(TERM_GENERATION_CONFIG.maxCharacters).toBe(600);
    });
  });

  describe('DIFFICULTY_DESCRIPTIONS', () => {
    it('beginnerの説明が定義されていること', () => {
      expect(DIFFICULTY_DESCRIPTIONS.beginner).toBeDefined();
      expect(DIFFICULTY_DESCRIPTIONS.beginner).toContain('初級');
    });

    it('intermediateの説明が定義されていること', () => {
      expect(DIFFICULTY_DESCRIPTIONS.intermediate).toBeDefined();
      expect(DIFFICULTY_DESCRIPTIONS.intermediate).toContain('中級');
    });

    it('advancedの説明が定義されていること', () => {
      expect(DIFFICULTY_DESCRIPTIONS.advanced).toBeDefined();
      expect(DIFFICULTY_DESCRIPTIONS.advanced).toContain('上級');
    });
  });

  describe('buildTermGenerationPrompt', () => {
    it('難易度なしでプロンプトを生成できること', () => {
      const prompt = buildTermGenerationPrompt();

      expect(prompt).toContain('投資・金融用語');
      expect(prompt).toContain('500文字');
      expect(prompt).toContain('400〜600文字');
    });

    it('beginner難易度でプロンプトを生成できること', () => {
      const prompt = buildTermGenerationPrompt({ difficulty: 'beginner' });

      expect(prompt).toContain('初級');
      expect(prompt).toContain('500文字');
    });

    it('intermediate難易度でプロンプトを生成できること', () => {
      const prompt = buildTermGenerationPrompt({ difficulty: 'intermediate' });

      expect(prompt).toContain('中級');
      expect(prompt).toContain('500文字');
    });

    it('advanced難易度でプロンプトを生成できること', () => {
      const prompt = buildTermGenerationPrompt({ difficulty: 'advanced' });

      expect(prompt).toContain('上級');
      expect(prompt).toContain('500文字');
    });

    it('除外用語リストを含めてプロンプトを生成できること', () => {
      const excludeTerms = ['PER', 'PBR', 'ROE'];
      const prompt = buildTermGenerationPrompt({ excludeTerms });

      expect(prompt).toContain('PER');
      expect(prompt).toContain('PBR');
      expect(prompt).toContain('ROE');
      expect(prompt).toContain('除外');
    });

    it('空の除外用語リストでもエラーにならないこと', () => {
      const prompt = buildTermGenerationPrompt({ excludeTerms: [] });

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('JSON形式の出力指示が含まれていること', () => {
      const prompt = buildTermGenerationPrompt();

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('name');
      expect(prompt).toContain('description');
      expect(prompt).toContain('difficulty');
    });

    it('難易度と除外用語を両方指定できること', () => {
      const prompt = buildTermGenerationPrompt({
        difficulty: 'advanced',
        excludeTerms: ['デリバティブ', 'オプション'],
      });

      expect(prompt).toContain('上級');
      expect(prompt).toContain('デリバティブ');
      expect(prompt).toContain('オプション');
    });
  });

  describe('DifficultyLevel', () => {
    it('beginner, intermediate, advancedが有効な難易度であること', () => {
      const difficulties: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

      difficulties.forEach((difficulty) => {
        const prompt = buildTermGenerationPrompt({ difficulty });
        expect(prompt).toBeDefined();
      });
    });
  });
});
