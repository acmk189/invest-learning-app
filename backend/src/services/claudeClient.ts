/**
 * Claude APIクライアント
 *
 * Requirements: 12.5
 *
 * Claude API（Anthropic）のクライアントを提供します。
 * Haikuモデルをデフォルトとして設定し、コスト最適化を実現します。
 */

import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from './apiKeyConfig';
// ApiKeyErrorはapiKeyConfigからエクスポートされ、getApiKey()が失敗時にスローする
export { ApiKeyError } from './apiKeyConfig';

/**
 * 利用可能なClaudeモデル（エイリアス - 常に最新バージョンを使用）
 */
export const CLAUDE_MODELS = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-4-5',
} as const;

/**
 * デフォルトモデル（コスト最適化のためHaiku）
 */
export const DEFAULT_MODEL = CLAUDE_MODELS.haiku;

/**
 * デフォルトの最大トークン数
 */
export const DEFAULT_MAX_TOKENS = 4096;

/**
 * メッセージ送信オプション
 */
export interface SendMessageOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

/**
 * Claude APIレスポンス
 */
export interface ClaudeResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  stopReason: string | null;
}

/**
 * Claude APIクライアントクラス
 *
 * シングルトンパターンでインスタンスを管理し、
 * API呼び出しを抽象化します。
 */
export class ClaudeClient {
  private client: Anthropic;
  private initialized: boolean = false;

  /**
   * コンストラクタ
   *
   * @param apiKey - Anthropic APIキー
   */
  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
    this.initialized = true;
  }

  /**
   * デフォルトモデルを取得
   *
   * @returns デフォルトモデル名
   */
  getDefaultModel(): string {
    return DEFAULT_MODEL;
  }

  /**
   * 初期化済みかどうかを確認
   *
   * @returns 初期化済みの場合true
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * メッセージを送信
   *
   * @param message - 送信するメッセージ
   * @param options - オプション設定
   * @returns Claude APIのレスポンス
   */
  async sendMessage(
    message: string,
    options: SendMessageOptions = {}
  ): Promise<ClaudeResponse> {
    const {
      model = DEFAULT_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature,
      system,
    } = options;

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      ...(temperature !== undefined && { temperature }),
      ...(system && { system }),
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    // コンテンツを抽出
    const textContent = response.content.find((c) => c.type === 'text');
    const content = textContent && 'text' in textContent ? textContent.text : '';

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
      stopReason: response.stop_reason,
    };
  }

  /**
   * 内部のAnthropicクライアントを取得（テスト用）
   *
   * @returns Anthropicクライアントインスタンス
   */
  getInternalClient(): Anthropic {
    return this.client;
  }
}

/**
 * シングルトンインスタンス
 */
let claudeClientInstance: ClaudeClient | undefined;

/**
 * Claude APIクライアントを取得
 *
 * シングルトンパターンでインスタンスを返します。
 * apiKeyConfig.getApiKey()を使用して環境変数から安全にAPIキーを読み込みます。
 *
 * @returns ClaudeClientインスタンス
 * @throws {ApiKeyError} 環境変数が設定されていない場合にエラーをスロー
 *
 * @see apiKeyConfig.ts - APIキー読み込みとHTTPS設定の詳細
 */
export function getClaudeClient(): ClaudeClient {
  if (claudeClientInstance) {
    return claudeClientInstance;
  }

  // apiKeyConfig.getApiKey()を使用して安全にAPIキーを取得
  // 未設定・空文字・空白のみの場合はApiKeyErrorがスローされる
  const apiKey = getApiKey();

  claudeClientInstance = new ClaudeClient(apiKey);
  return claudeClientInstance;
}

/**
 * シングルトンインスタンスをリセット（テスト用）
 */
export function resetClaudeClient(): void {
  claudeClientInstance = undefined;
}
