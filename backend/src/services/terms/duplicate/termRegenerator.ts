/**
 * 再生成リクエスト機能
 * Task 10.3: 再生成リクエスト機能
 *
 * 重複検出時にAIサービスへ再生成リクエストを送信し、
 * ユニークな用語を取得する機能を提供します。
 *
 * Requirements: 4.3 (過去30日以内に配信した用語を除外)
 *
 * 動作:
 * 1. 用語を生成
 * 2. 重複チェック
 * 3. 重複の場合は除外リストに追加して再生成
 * 4. 最大再生成回数まで繰り返す
 */

import { Term, TermDifficulty } from '../../../models/terms.model';
import { TermGenerationService, GenerateTermOptions } from '../termGenerationService';
import { DuplicateChecker } from './duplicateChecker';

/**
 * 再生成履歴エントリ
 *
 * 再生成が行われた際の記録を保持します。
 */
export interface RegenerationHistoryEntry {
  /** 重複した用語名 */
  termName: string;
  /** 再生成理由 */
  reason: 'duplicate' | 'invalid' | 'error';
  /** 試行番号 */
  attemptNumber: number;
  /** タイムスタンプ */
  timestamp?: Date;
}

/**
 * 再生成結果
 *
 * 用語の再生成処理の結果を表現します。
 */
export interface TermRegenerationResult {
  /** 成功したかどうか */
  success: boolean;
  /** 生成された用語（成功時のみ） */
  term?: Term;
  /** 総試行回数 */
  attempts: number;
  /** 再生成回数（初回を除く） */
  regeneratedCount: number;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
  /** 再生成履歴 */
  regenerationHistory?: RegenerationHistoryEntry[];
}

/**
 * 再生成オプション
 *
 * 用語生成のオプションを拡張します。
 */
export interface RegenerationOptions extends GenerateTermOptions {
  /**
   * 追加の除外用語リスト
   *
   * 配信済み用語に加えて除外したい用語を指定します。
   */
  excludeTerms?: string[];
}

/**
 * 再生成機能の設定
 */
export interface TermRegeneratorConfig {
  /**
   * 最大再生成回数
   * @default 5
   */
  maxRegenerations?: number;

  /**
   * ログ出力を有効にするか
   * @default false
   */
  enableLogging?: boolean;
}

/**
 * 用語再生成器
 *
 * 重複した用語が生成された場合に自動的に再生成を行い、
 * ユニークな用語を取得します。
 *
 * @example
 * const service = new TermGenerationService(claudeClient);
 * const checker = new DuplicateChecker(deliveredTerms);
 * const regenerator = new TermRegenerator(service, checker);
 *
 * // ユニークな用語を生成
 * const result = await regenerator.generateUniqueTerm({
 *   difficulty: 'beginner',
 * });
 *
 * if (result.success) {
 *   console.log(`生成された用語: ${result.term.name}`);
 *   console.log(`試行回数: ${result.attempts}`);
 * }
 */
export class TermRegenerator {
  /**
   * 用語生成サービス
   */
  private readonly termGenerationService: TermGenerationService;

  /**
   * 重複チェッカー
   */
  private readonly duplicateChecker: DuplicateChecker;

  /**
   * 最大再生成回数
   */
  private readonly maxRegenerations: number;

  /**
   * ログ出力を有効にするか
   */
  private readonly enableLogging: boolean;

  /**
   * コンストラクタ
   *
   * @param termGenerationService - 用語生成サービス
   * @param duplicateChecker - 重複チェッカー
   * @param config - 設定
   */
  constructor(
    termGenerationService: TermGenerationService,
    duplicateChecker: DuplicateChecker,
    config: TermRegeneratorConfig = {}
  ) {
    this.termGenerationService = termGenerationService;
    this.duplicateChecker = duplicateChecker;
    this.maxRegenerations = config.maxRegenerations ?? 5;
    this.enableLogging = config.enableLogging ?? false;
  }

  /**
   * ユニークな用語を生成
   *
   * 重複している場合は最大再生成回数まで再生成を試みます。
   *
   * @param options - 生成オプション
   * @returns 再生成結果
   */
  async generateUniqueTerm(
    options: RegenerationOptions = {}
  ): Promise<TermRegenerationResult> {
    const history: RegenerationHistoryEntry[] = [];
    const excludeTerms = new Set<string>(options.excludeTerms || []);
    let attempts = 0;
    let regeneratedCount = 0;

    // 最大試行回数: 初回 + maxRegenerations
    const maxAttempts = 1 + this.maxRegenerations;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // 用語を生成
        const generateOptions: GenerateTermOptions = {
          ...options,
          excludeTerms: Array.from(excludeTerms),
        };

        const generationResult = await this.termGenerationService.generateTerm(
          generateOptions
        );

        const term = generationResult.term;

        // 重複チェック
        const checkResult = this.duplicateChecker.check(term.name);

        if (!checkResult.isDuplicate) {
          // 重複なし: 成功
          this.log(
            `ユニークな用語を生成しました: ${term.name} (試行: ${attempts}回)`
          );

          return {
            success: true,
            term,
            attempts,
            regeneratedCount,
            regenerationHistory: history.length > 0 ? history : undefined,
          };
        }

        // 重複あり: 再生成が必要
        // 最後の試行でない場合のみカウント（最後の試行は再生成が行われないため）
        if (attempts < maxAttempts) {
          this.log(
            `重複を検出しました: ${term.name} (マッチ: ${checkResult.matchedTerm}), 再生成します`
          );
          regeneratedCount++;
        } else {
          this.log(
            `重複を検出しました: ${term.name} (マッチ: ${checkResult.matchedTerm}), 最大試行回数に達しました`
          );
        }

        // 履歴に追加
        history.push({
          termName: term.name,
          reason: 'duplicate',
          attemptNumber: attempts,
          timestamp: new Date(),
        });

        // 除外リストに追加
        excludeTerms.add(term.name);

      } catch (error) {
        // 生成エラー
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`用語生成エラー: ${errorMessage}`);

        history.push({
          termName: 'unknown',
          reason: 'error',
          attemptNumber: attempts,
          timestamp: new Date(),
        });

        // 生成エラーは即座に失敗とする
        return {
          success: false,
          attempts,
          regeneratedCount,
          error: `用語生成に失敗しました: ${errorMessage}`,
          regenerationHistory: history.length > 0 ? history : undefined,
        };
      }
    }

    // 最大再生成回数を超えた
    this.log(
      `最大再生成回数(${this.maxRegenerations})を超えました`
    );

    return {
      success: false,
      attempts,
      regeneratedCount,
      error: `最大再生成回数(${this.maxRegenerations})を超えました。ユニークな用語を生成できませんでした。`,
      regenerationHistory: history,
    };
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): Required<TermRegeneratorConfig> {
    return {
      maxRegenerations: this.maxRegenerations,
      enableLogging: this.enableLogging,
    };
  }

  /**
   * ログ出力
   *
   * @param message - ログメッセージ
   */
  private log(message: string): void {
    if (this.enableLogging) {
      console.log(`[TermRegenerator] ${message}`);
    }
  }
}
