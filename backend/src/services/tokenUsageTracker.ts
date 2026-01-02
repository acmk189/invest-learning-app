/**
 * トークン使用量監視機能
 *
 * Requirements: 10.3
 *
 * Claude API呼び出しごとのトークン使用量を記録し、
 * 累積トークン使用量をログに出力する機能を提供します。
 *
 * 主な機能:
 * - API呼び出しごとのトークン使用量を記録
 * - 累積トークン使用量の集計
 * - モデル別のトークン使用量の集計
 * - ログ出力機能
 *
 * @see https://docs.anthropic.com/claude/reference/messages - Claude API Messages Reference
 */

/**
 * トークン使用量の記録
 *
 * 個々のAPI呼び出しにおけるトークン使用量を表します。
 */
export interface TokenUsageRecord {
  /** 記録日時 */
  timestamp: Date;
  /** 入力トークン数 */
  inputTokens: number;
  /** 出力トークン数 */
  outputTokens: number;
  /** 使用したモデル名 */
  model: string;
  /** 操作名（ニュース要約、用語生成など） */
  operation: string;
}

/**
 * トークン使用量の入力パラメータ
 *
 * recordUsage()メソッドに渡すパラメータ。
 * timestampは自動的に設定されます。
 */
export interface TokenUsageInput {
  /** 入力トークン数 */
  inputTokens: number;
  /** 出力トークン数 */
  outputTokens: number;
  /** 使用したモデル名 */
  model: string;
  /** 操作名（ニュース要約、用語生成など） */
  operation: string;
}

/**
 * モデル別のトークン使用量サマリー
 *
 * 特定のモデルにおける累積トークン使用量を表します。
 */
export interface ModelUsageSummary {
  /** 累積入力トークン数 */
  inputTokens: number;
  /** 累積出力トークン数 */
  outputTokens: number;
  /** リクエスト回数 */
  count: number;
}

/**
 * トークン使用量のサマリー
 *
 * 全体およびモデル別の累積トークン使用量を表します。
 */
export interface TokenUsageSummary {
  /** 累積入力トークン数 */
  totalInputTokens: number;
  /** 累積出力トークン数 */
  totalOutputTokens: number;
  /** 累積トークン数（入力+出力） */
  totalTokens: number;
  /** 総リクエスト回数 */
  requestCount: number;
  /** モデル別のトークン使用量 */
  recordsByModel: Record<string, ModelUsageSummary>;
}

/**
 * トークン使用量追跡クラス
 *
 * Claude API呼び出しのトークン使用量を追跡し、
 * 累積値の集計とログ出力を行います。
 *
 * シングルトンパターンで実装されており、
 * getTokenUsageTracker()で取得できます。
 */
export class TokenUsageTracker {
  private records: TokenUsageRecord[] = [];

  /**
   * トークン使用量を記録
   *
   * API呼び出しごとに呼び出され、トークン使用量を記録します。
   *
   * @param input - トークン使用量の入力パラメータ
   */
  recordUsage(input: TokenUsageInput): void {
    const record: TokenUsageRecord = {
      timestamp: new Date(),
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      model: input.model,
      operation: input.operation,
    };

    this.records.push(record);
  }

  /**
   * すべての記録を取得
   *
   * @returns トークン使用量の記録配列
   */
  getRecords(): TokenUsageRecord[] {
    return [...this.records];
  }

  /**
   * トークン使用量のサマリーを取得
   *
   * 累積トークン使用量とモデル別の集計を返します。
   *
   * @returns トークン使用量のサマリー
   */
  getSummary(): TokenUsageSummary {
    const summary: TokenUsageSummary = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      requestCount: 0,
      recordsByModel: {},
    };

    for (const record of this.records) {
      // 全体の集計
      summary.totalInputTokens += record.inputTokens;
      summary.totalOutputTokens += record.outputTokens;
      summary.requestCount += 1;

      // モデル別の集計
      if (!summary.recordsByModel[record.model]) {
        summary.recordsByModel[record.model] = {
          inputTokens: 0,
          outputTokens: 0,
          count: 0,
        };
      }

      summary.recordsByModel[record.model].inputTokens += record.inputTokens;
      summary.recordsByModel[record.model].outputTokens += record.outputTokens;
      summary.recordsByModel[record.model].count += 1;
    }

    // 総トークン数を計算
    summary.totalTokens = summary.totalInputTokens + summary.totalOutputTokens;

    return summary;
  }

  /**
   * 累積トークン使用量をログに出力
   *
   * 全体およびモデル別の累積トークン使用量をコンソールに出力します。
   */
  logSummary(): void {
    const summary = this.getSummary();

    console.log('=== トークン使用量サマリー ===');
    console.log(`総リクエスト数: ${summary.requestCount}`);
    console.log(`入力トークン合計: ${summary.totalInputTokens}`);
    console.log(`出力トークン合計: ${summary.totalOutputTokens}`);
    console.log(`トークン合計: ${summary.totalTokens}`);

    if (Object.keys(summary.recordsByModel).length > 0) {
      console.log('--- モデル別 ---');
      for (const [model, modelSummary] of Object.entries(
        summary.recordsByModel
      )) {
        console.log(
          `  ${model}: 入力=${modelSummary.inputTokens}, 出力=${modelSummary.outputTokens}, リクエスト数=${modelSummary.count}`
        );
      }
    }

    console.log('============================');
  }

  /**
   * 個別のトークン使用量をログに出力
   *
   * 特定のAPI呼び出しのトークン使用量をコンソールに出力します。
   *
   * @param record - トークン使用量の記録
   */
  logUsage(record: TokenUsageRecord): void {
    console.log(
      `[トークン使用量] 操作=${record.operation}, モデル=${record.model}, 入力=${record.inputTokens}, 出力=${record.outputTokens}, 合計=${record.inputTokens + record.outputTokens}`
    );
  }

  /**
   * すべての記録をクリア
   */
  reset(): void {
    this.records = [];
  }
}

/**
 * シングルトンインスタンス
 */
let tokenUsageTrackerInstance: TokenUsageTracker | undefined;

/**
 * トークン使用量追跡インスタンスを取得
 *
 * シングルトンパターンでインスタンスを返します。
 *
 * @returns TokenUsageTrackerインスタンス
 */
export function getTokenUsageTracker(): TokenUsageTracker {
  if (!tokenUsageTrackerInstance) {
    tokenUsageTrackerInstance = new TokenUsageTracker();
  }
  return tokenUsageTrackerInstance;
}

/**
 * シングルトンインスタンスをリセット（テスト用）
 */
export function resetTokenUsageTracker(): void {
  tokenUsageTrackerInstance = undefined;
}
