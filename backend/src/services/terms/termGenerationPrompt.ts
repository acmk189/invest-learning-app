/**
 * 用語生成プロンプト
 * Task 5.1, 5.2: 用語生成プロンプト基本実装、難易度指定機能
 *
 * 投資・金融用語を生成するためのプロンプトを構築します。
 * 難易度(初級・中級・上級)に応じたプロンプト調整と、
 * 重複除外用語リストの指定が可能です。
 *
 * Requirements:
 * - 4.1: 1日3つ投資用語生成
 * - 4.2: 各用語に約500文字の解説生成
 * - 4.4: 初級〜上級の難易度混在
 *
 * @see https://docs.anthropic.com/en/api/messages - Claude Messages API
 */

import { TermDifficulty } from '../../models/terms.model';

/**
 * 難易度レベル(TermDifficultyのエイリアス)
 *
 * @example
 * const difficulty: DifficultyLevel = 'beginner';
 */
export type DifficultyLevel = TermDifficulty;

/**
 * 用語生成設定
 *
 * 解説文の文字数に関する設定値を保持します。
 */
export const TERM_GENERATION_CONFIG = {
  /** 目標文字数 */
  targetCharacters: 500,
  /** 最小許容文字数 */
  minCharacters: 400,
  /** 最大許容文字数 */
  maxCharacters: 600,
} as const;

/**
 * 難易度ごとの説明文
 *
 * プロンプト内で難易度に応じた用語選択の指示に使用します。
 */
export const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
  beginner:
    '【初級レベル】投資を始めたばかりの人が最初に学ぶべき基本的な用語を選んでください。日常会話でも使われる分かりやすい用語が望ましいです。',
  intermediate:
    '【中級レベル】投資の基礎を理解した人が次のステップとして学ぶべき用語を選んでください。実際の投資判断に役立つ実践的な用語が望ましいです。',
  advanced:
    '【上級レベル】経験豊富な投資家が使う専門的な用語を選んでください。高度な投資戦略やリスク管理に関連する用語が望ましいです。',
};

/**
 * 用語生成プロンプトオプション
 */
export interface TermGenerationPromptOptions {
  /**
   * 難易度
   *
   * 指定しない場合はランダムな難易度の用語が生成されます。
   */
  difficulty?: DifficultyLevel;

  /**
   * 除外する用語リスト
   *
   * 過去に配信済みの用語を指定することで重複を防ぎます。
   */
  excludeTerms?: string[];
}

/**
 * 除外用語リストをフォーマットする
 *
 * @param excludeTerms - 除外する用語リスト
 * @returns フォーマットされた除外用語テキスト
 */
function formatExcludeTerms(excludeTerms: string[]): string {
  if (excludeTerms.length === 0) {
    return '';
  }

  const termsList = excludeTerms.map((term) => `- ${term}`).join('\n');

  return `
## 除外する用語(これらの用語は選ばないでください)
${termsList}
`;
}

/**
 * 難易度指示テキストを生成する
 *
 * @param difficulty - 難易度
 * @returns 難易度に応じた指示テキスト
 */
function getDifficultyInstruction(difficulty?: DifficultyLevel): string {
  if (!difficulty) {
    return '難易度はランダムに選択してください(beginner, intermediate, advancedのいずれか)。';
  }

  return DIFFICULTY_DESCRIPTIONS[difficulty];
}

/**
 * 用語生成プロンプトを構築する
 *
 * Claude APIに送信するプロンプトを生成します。
 * 1つの投資・金融用語と約500文字の解説を生成するよう指示します。
 *
 * @param options - プロンプトオプション
 * @returns Claude APIに送信するプロンプト文字列
 *
 * @example
 * // 基本的な使用
 * const prompt = buildTermGenerationPrompt();
 *
 * @example
 * // 難易度指定
 * const prompt = buildTermGenerationPrompt({ difficulty: 'beginner' });
 *
 * @example
 * // 除外用語指定
 * const prompt = buildTermGenerationPrompt({
 *   difficulty: 'intermediate',
 *   excludeTerms: ['PER', 'PBR', 'ROE']
 * });
 */
export function buildTermGenerationPrompt(
  options: TermGenerationPromptOptions = {}
): string {
  const { difficulty, excludeTerms = [] } = options;

  const difficultyInstruction = getDifficultyInstruction(difficulty);
  const excludeTermsSection = formatExcludeTerms(excludeTerms);

  return `あなたは投資・金融教育の専門家です。投資初学者向けに、1つの投資・金融用語とその解説を作成してください。

## 指示
1. 投資・金融・経済に関する用語を1つ選んでください
2. 選んだ用語について、投資初学者にも分かりやすい解説を作成してください
3. 解説は約${TERM_GENERATION_CONFIG.targetCharacters}文字(${TERM_GENERATION_CONFIG.minCharacters}〜${TERM_GENERATION_CONFIG.maxCharacters}文字)で作成してください
4. ${difficultyInstruction}

## 解説の書き方
- まず用語の基本的な定義を簡潔に説明してください
- 次に、なぜこの用語が投資において重要なのかを説明してください
- 具体例や実際の使われ方を含めてください
- 難しい概念は身近な例えを使って説明してください
- 関連する用語があれば軽く触れてください
${excludeTermsSection}
## 出力形式
必ず以下のJSON形式で出力してください。JSONのみを出力し、他のテキストは含めないでください。

\`\`\`json
{
  "name": "用語名",
  "description": "解説文(${TERM_GENERATION_CONFIG.minCharacters}〜${TERM_GENERATION_CONFIG.maxCharacters}文字)",
  "difficulty": "${difficulty || 'beginner|intermediate|advanced'}"
}
\`\`\`

JSONを出力してください。`;
}
