/**
 * 用語レスポンスパーサー
 * Task 5.3, 5.4: 用語レスポンスパース機能、用語文字数検証機能
 *
 * Claude APIからのレスポンスを解析し、用語データを抽出・検証します。
 *
 * Requirements:
 * - 4.1: 投資・金融用語生成
 * - 4.2: 各用語に約500文字の解説生成
 *
 * @see https://docs.anthropic.com/en/api/messages - Claude Messages API
 */

import { ClaudeResponse } from '../claudeClient';
import { Term, TermDifficulty } from '../../models/terms.model';
import { TERM_GENERATION_CONFIG } from './termGenerationPrompt';

/**
 * 有効な難易度のリスト
 */
const VALID_DIFFICULTIES: TermDifficulty[] = ['beginner', 'intermediate', 'advanced'];

/**
 * 用語パース結果
 *
 * Claude APIレスポンスから抽出した用語情報を保持します。
 */
export interface TermParseResult {
  /** パース成功かどうか */
  success: boolean;
  /** 抽出された用語(成功時のみ) */
  term?: Term;
  /** エラーメッセージ(失敗時のみ) */
  error?: string;
  /** 使用されたモデル名 */
  model: string;
  /** 入力トークン数 */
  inputTokens: number;
  /** 出力トークン数 */
  outputTokens: number;
}

/**
 * 用語文字数検証結果
 *
 * 解説文の文字数が許容範囲内かどうかの検証結果を保持します。
 */
export interface TermValidationResult {
  /** 文字数が許容範囲内かどうか */
  isValid: boolean;
  /** 文字数(空白・改行を除く) */
  characterCount: number;
  /** 警告メッセージ(範囲外の場合) */
  warning?: string;
}

/**
 * JSON形式の用語データ(パース前の生データ)
 */
interface RawTermData {
  name?: unknown;
  description?: unknown;
  difficulty?: unknown;
}

/**
 * 文字数をカウントする(空白・改行を除く)
 *
 * @param text - カウント対象のテキスト
 * @returns 空白・改行を除いた文字数
 */
function countCharacters(text: string): number {
  // 前後の空白をトリムし、改行と空白を除去してカウント
  const trimmed = text.trim();
  // 改行とタブと空白を除去
  const withoutWhitespace = trimmed.replace(/[\s\n\r\t]/g, '');
  return withoutWhitespace.length;
}

/**
 * コンテンツからJSONを抽出する
 *
 * コードブロック(```json ... ```)で囲まれている場合は中身を抽出します。
 *
 * @param content - Claude APIのレスポンスコンテンツ
 * @returns 抽出されたJSON文字列
 */
function extractJson(content: string): string {
  const trimmed = content.trim();

  // コードブロックからJSONを抽出
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  return trimmed;
}

/**
 * 難易度が有効かどうかを検証する
 *
 * @param difficulty - 検証する難易度
 * @returns 有効な難易度の場合true
 */
function isValidDifficulty(difficulty: unknown): difficulty is TermDifficulty {
  return (
    typeof difficulty === 'string' && VALID_DIFFICULTIES.includes(difficulty as TermDifficulty)
  );
}

/**
 * Claude APIレスポンスを解析して用語情報を抽出
 *
 * JSON形式のレスポンスをパースし、用語名・解説文・難易度を抽出します。
 * パースに失敗した場合はエラー情報を含む結果を返します。
 *
 * @param response - Claude APIからのレスポンス
 * @returns パース結果
 *
 * @example
 * const response = await claudeClient.sendMessage(prompt);
 * const result = parseTermResponse(response);
 * if (result.success) {
 *   console.log(result.term.name);
 * }
 */
export function parseTermResponse(response: ClaudeResponse): TermParseResult {
  const baseResult = {
    model: response.model,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
  };

  // コンテンツが空の場合
  if (!response.content || response.content.trim() === '') {
    return {
      ...baseResult,
      success: false,
      error: 'レスポンスが空です。',
    };
  }

  try {
    // JSONを抽出してパース
    const jsonString = extractJson(response.content);
    const data: RawTermData = JSON.parse(jsonString);

    // nameフィールドの検証
    if (typeof data.name !== 'string' || data.name.trim() === '') {
      return {
        ...baseResult,
        success: false,
        error: 'nameフィールドが無効です。用語名は必須です。',
      };
    }

    // descriptionフィールドの検証
    if (typeof data.description !== 'string') {
      return {
        ...baseResult,
        success: false,
        error: 'descriptionフィールドが無効です。解説文は必須です。',
      };
    }

    // difficultyフィールドの検証
    if (!isValidDifficulty(data.difficulty)) {
      return {
        ...baseResult,
        success: false,
        error: `difficultyフィールドが無効です。beginner, intermediate, advancedのいずれかを指定してください。(現在: ${String(data.difficulty)})`,
      };
    }

    // 成功
    const term: Term = {
      name: data.name.trim(),
      description: data.description,
      difficulty: data.difficulty,
    };

    return {
      ...baseResult,
      success: true,
      term,
    };
  } catch (error) {
    // JSONパースエラー
    return {
      ...baseResult,
      success: false,
      error: `JSONのパースに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 解説文の文字数を検証
 *
 * 解説文が許容範囲(400〜600文字)内かどうかをチェックします。
 * 範囲外の場合は警告メッセージを含む結果を返します。
 *
 * @param description - 検証する解説文
 * @returns 検証結果
 *
 * @example
 * const validation = validateTermDescription(term.description);
 * if (!validation.isValid) {
 *   console.warn(validation.warning);
 * }
 */
export function validateTermDescription(description: string): TermValidationResult {
  const characterCount = countCharacters(description);

  // 空の解説文は無効
  if (characterCount === 0) {
    return {
      isValid: false,
      characterCount: 0,
      warning: '解説文が空です。再生成が必要です。',
    };
  }

  // 最小文字数未満
  if (characterCount < TERM_GENERATION_CONFIG.minCharacters) {
    return {
      isValid: false,
      characterCount,
      warning: `解説文が短すぎます(${characterCount}文字)。目標は${TERM_GENERATION_CONFIG.minCharacters}〜${TERM_GENERATION_CONFIG.maxCharacters}文字です。`,
    };
  }

  // 最大文字数超過
  if (characterCount > TERM_GENERATION_CONFIG.maxCharacters) {
    return {
      isValid: false,
      characterCount,
      warning: `解説文が長すぎます(${characterCount}文字)。目標は${TERM_GENERATION_CONFIG.minCharacters}〜${TERM_GENERATION_CONFIG.maxCharacters}文字です。`,
    };
  }

  // 有効な範囲内
  return {
    isValid: true,
    characterCount,
  };
}
