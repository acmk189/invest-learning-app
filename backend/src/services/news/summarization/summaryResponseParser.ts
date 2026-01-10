/**
 * 要約レスポンスパーサー
 * Task 4.3, 4.4: 要約レスポンスパース機能、要約文字数検証機能
 *
 * Claude APIからのレスポンスを解析し、要約文を抽出・検証します。
 *
 * Requirements: 1.4 (複数記事を約2000文字に要約)
 */

import { ClaudeResponse } from '../../claudeClient';
import { SUMMARY_CONFIG } from './newsSummaryPrompt';

/**
 * 要約パース結果
 *
 * Claude APIレスポンスから抽出した要約情報を保持します。
 */
export interface SummaryParseResult {
  /** 抽出された要約文 */
  summary: string;
  /** 要約文の文字数(空白・改行を除く) */
  characterCount: number;
  /** 使用されたモデル名 */
  model: string;
  /** 入力トークン数 */
  inputTokens: number;
  /** 出力トークン数 */
  outputTokens: number;
}

/**
 * 要約文字数検証結果
 *
 * 要約文の文字数が許容範囲内かどうかの検証結果を保持します。
 */
export interface SummaryValidationResult {
  /** 文字数が許容範囲内かどうか */
  isValid: boolean;
  /** 文字数(空白・改行を除く) */
  characterCount: number;
  /** 警告メッセージ(範囲外の場合) */
  warning?: string;
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
 * Claude APIレスポンスを解析して要約情報を抽出
 *
 * @param response - Claude APIからのレスポンス
 * @returns パース結果
 */
export function parseSummaryResponse(response: ClaudeResponse): SummaryParseResult {
  // コンテンツをトリム
  const summary = response.content.trim();

  // 文字数をカウント(空白・改行を除く)
  const characterCount = countCharacters(summary);

  return {
    summary,
    characterCount,
    model: response.model,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
  };
}

/**
 * 要約文の文字数を検証
 *
 * 要約文が許容範囲(1800〜2200文字)内かどうかをチェックします。
 * 範囲外の場合は警告メッセージを含む結果を返します。
 *
 * @param summary - 検証する要約文
 * @returns 検証結果
 */
export function validateSummaryLength(summary: string): SummaryValidationResult {
  const characterCount = countCharacters(summary);

  // 空の要約は無効
  if (characterCount === 0) {
    return {
      isValid: false,
      characterCount: 0,
      warning: '要約文が空です。再生成が必要です。',
    };
  }

  // 最小文字数未満
  if (characterCount < SUMMARY_CONFIG.minCharacters) {
    return {
      isValid: false,
      characterCount,
      warning: `要約文が短すぎます(${characterCount}文字)。目標は${SUMMARY_CONFIG.minCharacters}〜${SUMMARY_CONFIG.maxCharacters}文字です。`,
    };
  }

  // 最大文字数超過
  if (characterCount > SUMMARY_CONFIG.maxCharacters) {
    return {
      isValid: false,
      characterCount,
      warning: `要約文が長すぎます(${characterCount}文字)。目標は${SUMMARY_CONFIG.minCharacters}〜${SUMMARY_CONFIG.maxCharacters}文字です。`,
    };
  }

  // 有効な範囲内
  return {
    isValid: true,
    characterCount,
  };
}
