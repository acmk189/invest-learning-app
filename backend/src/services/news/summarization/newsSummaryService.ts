/**
 * ニュース要約サービス
 * Task 4.5: 要約失敗時フォールバック処理
 *
 * ニュース記事の要約を行い、失敗時のリトライ処理と
 * エラーログ記録を提供します。
 *
 * Requirements: 1.7 (バッチ失敗時エラーログ+リトライ)
 *
 * @see https://docs.anthropic.com/en/api/messages - Claude Messages API
 */

import { ClaudeClient, ClaudeResponse } from '../../claudeClient';
import {
  NewsArticle,
  buildEnglishNewsSummaryPrompt,
  buildJapaneseNewsSummaryPrompt,
} from './newsSummaryPrompt';
import {
  parseSummaryResponse,
  validateSummaryLength,
} from './summaryResponseParser';
import { AppError, ErrorType, ErrorSeverity } from '../../../errors/types';

/**
 * ニュース要約エラー
 *
 * 要約処理中に発生したエラーを表現します。
 * 操作名(operation)を保持し、どの処理で失敗したかを追跡できます。
 */
export class NewsSummaryError extends AppError {
  /**
   * 操作名(例: 'english-news-summary', 'japanese-news-summary')
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
    this.name = 'NewsSummaryError';
    this.operation = operation;
    this.attempts = attempts;
  }
}

/**
 * 要約結果
 *
 * ニュース要約の結果を保持します。
 */
export interface SummaryResult {
  /** 要約文 */
  summary: string;
  /** 文字数 */
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
 * ニュース要約サービスの設定
 */
export interface NewsSummaryServiceConfig {
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
 * ニュース要約サービス
 *
 * Claude APIを使用してニュース記事を要約します。
 * 失敗時のリトライ処理とエラーログ記録を提供します。
 */
export class NewsSummaryService {
  private readonly client: ClaudeClient;
  private readonly maxRetries: number;
  private readonly logErrors: boolean;

  /**
   * コンストラクタ
   *
   * @param client - Claude APIクライアント
   * @param config - サービス設定
   */
  constructor(client: ClaudeClient, config: NewsSummaryServiceConfig = {}) {
    this.client = client;
    this.maxRetries = config.maxRetries ?? 3;
    this.logErrors = config.logErrors ?? true;
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): Required<NewsSummaryServiceConfig> {
    return {
      maxRetries: this.maxRetries,
      logErrors: this.logErrors,
    };
  }

  /**
   * 英語ニュースを要約する
   *
   * 複数の英語ニュース記事を日本語に翻訳し、約2000文字に要約します。
   * 失敗時は最大リトライ回数までリトライします。
   *
   * @param articles - 要約対象の英語ニュース記事配列
   * @returns 要約結果
   * @throws {NewsSummaryError} 最大リトライ回数を超えた場合
   */
  async summarizeEnglishNews(articles: NewsArticle[]): Promise<SummaryResult> {
    const prompt = buildEnglishNewsSummaryPrompt(articles);
    return this.executeWithRetry(prompt, 'english-news-summary');
  }

  /**
   * 日本語ニュースを要約する
   *
   * 複数の日本語ニュース記事を約2000文字に要約します。
   * 失敗時は最大リトライ回数までリトライします。
   *
   * @param articles - 要約対象の日本語ニュース記事配列
   * @returns 要約結果
   * @throws {NewsSummaryError} 最大リトライ回数を超えた場合
   */
  async summarizeJapaneseNews(articles: NewsArticle[]): Promise<SummaryResult> {
    const prompt = buildJapaneseNewsSummaryPrompt(articles);
    return this.executeWithRetry(prompt, 'japanese-news-summary');
  }

  /**
   * リトライ付きで要約を実行
   *
   * @param prompt - 送信するプロンプト
   * @param operation - 操作名
   * @returns 要約結果
   * @throws {NewsSummaryError} 最大リトライ回数を超えた場合
   */
  private async executeWithRetry(
    prompt: string,
    operation: string
  ): Promise<SummaryResult> {
    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i <= this.maxRetries; i++) {
      attempts = i + 1;

      try {
        const response = await this.client.sendMessage(prompt, {
          operation,
        });

        return this.processResponse(response);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.logErrors) {
          console.error(
            `[NewsSummaryService] ${operation} failed (attempt ${attempts}/${this.maxRetries + 1}):`,
            lastError.message
          );
        }

        // 最後のリトライでなければ続行
        if (i < this.maxRetries) {
          continue;
        }
      }
    }

    // 全リトライ失敗
    throw new NewsSummaryError(
      `ニュース要約に失敗しました(${attempts}回試行): ${lastError?.message}`,
      operation,
      attempts,
      lastError
    );
  }

  /**
   * レスポンスを処理して結果を生成
   *
   * @param response - Claude APIレスポンス
   * @returns 要約結果
   */
  private processResponse(response: ClaudeResponse): SummaryResult {
    const parseResult = parseSummaryResponse(response);
    const validation = validateSummaryLength(parseResult.summary);

    return {
      summary: parseResult.summary,
      characterCount: parseResult.characterCount,
      isValid: validation.isValid,
      warning: validation.warning,
      model: parseResult.model,
      inputTokens: parseResult.inputTokens,
      outputTokens: parseResult.outputTokens,
    };
  }
}
