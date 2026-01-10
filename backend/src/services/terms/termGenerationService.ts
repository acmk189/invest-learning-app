/**
 * 用語生成サービス
 * Task 5.5: 用語生成失敗時フォールバック処理
 *
 * 投資・金融用語の生成を行い、失敗時のリトライ処理と
 * エラーログ記録を提供します。
 *
 * Requirements: 1.7 (バッチ失敗時エラーログ+リトライ)
 *
 * @see https://docs.anthropic.com/en/api/messages - Claude Messages API
 */

import { ClaudeClient, ClaudeResponse } from '../claudeClient';
import { Term, TermDifficulty } from '../../models/terms.model';
import {
  buildTermGenerationPrompt,
  TermGenerationPromptOptions,
} from './termGenerationPrompt';
import {
  parseTermResponse,
  validateTermDescription,
} from './termResponseParser';
import { AppError, ErrorType, ErrorSeverity } from '../../errors/types';

/**
 * 用語生成エラー
 *
 * 用語生成処理中に発生したエラーを表現します。
 * 操作名(operation)と試行回数を保持し、
 * どの処理で何回失敗したかを追跡できます。
 */
export class TermGenerationError extends AppError {
  /**
   * 操作名(例: 'term-generation')
   */
  public readonly operation: string;

  /**
   * 試行回数
   */
  public readonly attempts: number;

  constructor(
    message: string,
    operation: string,
    attempts: number,
    originalError?: Error
  ) {
    super(message, ErrorType.API, ErrorSeverity.HIGH, true, originalError);
    this.name = 'TermGenerationError';
    this.operation = operation;
    this.attempts = attempts;
  }
}

/**
 * 用語生成結果
 *
 * 用語生成の結果を保持します。
 */
export interface TermGenerationResult {
  /** 生成された用語 */
  term: Term;
  /** 解説文の文字数 */
  characterCount: number;
  /** 文字数が許容範囲内かどうか */
  isValid: boolean;
  /** 警告メッセージ(範囲外の場合) */
  warning?: string;
  /** 使用されたモデル名 */
  model: string;
  /** 入力トークン数 */
  inputTokens: number;
  /** 出力トークン数 */
  outputTokens: number;
}

/**
 * 用語生成サービスの設定
 */
export interface TermGenerationServiceConfig {
  /**
   * 最大リトライ回数
   * @default 3
   */
  maxRetries?: number;

  /**
   * エラーをログに記録するかどうか
   * @default true
   */
  logErrors?: boolean;
}

/**
 * 用語生成オプション
 */
export interface GenerateTermOptions {
  /**
   * 難易度
   *
   * 指定しない場合はランダムな難易度の用語が生成されます。
   */
  difficulty?: TermDifficulty;

  /**
   * 除外する用語リスト
   *
   * 過去に配信済みの用語を指定することで重複を防ぎます。
   */
  excludeTerms?: string[];
}

/**
 * 用語生成サービス
 *
 * Claude APIを使用して投資・金融用語を生成します。
 * 失敗時のリトライ処理とエラーログ記録を提供します。
 *
 * @example
 * const client = getClaudeClient();
 * const service = new TermGenerationService(client);
 *
 * // 基本的な用語生成
 * const result = await service.generateTerm();
 *
 * // 難易度を指定
 * const result = await service.generateTerm({ difficulty: 'advanced' });
 *
 * // 除外用語を指定(重複防止)
 * const result = await service.generateTerm({
 *   difficulty: 'beginner',
 *   excludeTerms: ['PER', 'PBR', 'ROE']
 * });
 */
export class TermGenerationService {
  private readonly client: ClaudeClient;
  private readonly maxRetries: number;
  private readonly logErrors: boolean;

  /**
   * コンストラクタ
   *
   * @param client - Claude APIクライアント
   * @param config - サービス設定
   */
  constructor(client: ClaudeClient, config: TermGenerationServiceConfig = {}) {
    this.client = client;
    this.maxRetries = config.maxRetries ?? 3;
    this.logErrors = config.logErrors ?? true;
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): Required<TermGenerationServiceConfig> {
    return {
      maxRetries: this.maxRetries,
      logErrors: this.logErrors,
    };
  }

  /**
   * 用語を生成する
   *
   * 1つの投資・金融用語と約500文字の解説を生成します。
   * 失敗時は最大リトライ回数までリトライします。
   *
   * @param options - 生成オプション
   * @returns 生成結果
   * @throws {TermGenerationError} 最大リトライ回数を超えた場合
   */
  async generateTerm(options: GenerateTermOptions = {}): Promise<TermGenerationResult> {
    const promptOptions: TermGenerationPromptOptions = {
      difficulty: options.difficulty,
      excludeTerms: options.excludeTerms,
    };

    const prompt = buildTermGenerationPrompt(promptOptions);
    return this.executeWithRetry(prompt, 'term-generation');
  }

  /**
   * リトライ付きで用語生成を実行
   *
   * @param prompt - 送信するプロンプト
   * @param operation - 操作名
   * @returns 生成結果
   * @throws {TermGenerationError} 最大リトライ回数を超えた場合
   */
  private async executeWithRetry(
    prompt: string,
    operation: string
  ): Promise<TermGenerationResult> {
    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i <= this.maxRetries; i++) {
      attempts = i + 1;

      try {
        const response = await this.client.sendMessage(prompt, {
          operation,
        });

        const result = this.processResponse(response);

        // パースに成功した場合のみ結果を返す
        if (result) {
          return result;
        }

        // パース失敗(result === null)の場合はリトライ
        lastError = new Error('レスポンスのパースに失敗しました');

        if (this.logErrors) {
          console.error(
            `[TermGenerationService] ${operation} parse failed (attempt ${attempts}/${this.maxRetries + 1})`
          );
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.logErrors) {
          console.error(
            `[TermGenerationService] ${operation} failed (attempt ${attempts}/${this.maxRetries + 1}):`,
            lastError.message
          );
        }
      }

      // 最後のリトライでなければ続行
      if (i < this.maxRetries) {
        continue;
      }
    }

    // 全リトライ失敗
    throw new TermGenerationError(
      `用語生成に失敗しました(${attempts}回試行): ${lastError?.message}`,
      operation,
      attempts,
      lastError
    );
  }

  /**
   * レスポンスを処理して結果を生成
   *
   * @param response - Claude APIレスポンス
   * @returns 生成結果(パース失敗時はnull)
   */
  private processResponse(response: ClaudeResponse): TermGenerationResult | null {
    const parseResult = parseTermResponse(response);

    // パース失敗
    if (!parseResult.success || !parseResult.term) {
      return null;
    }

    const validation = validateTermDescription(parseResult.term.description);

    return {
      term: parseResult.term,
      characterCount: validation.characterCount,
      isValid: validation.isValid,
      warning: validation.warning,
      model: parseResult.model,
      inputTokens: parseResult.inputTokens,
      outputTokens: parseResult.outputTokens,
    };
  }
}
