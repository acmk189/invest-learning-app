/**
 * 通信タイムアウト設定ユーティリティ
 *
 * Task 31.2: 通信タイムアウト設定
 * Requirements: 9.3
 *
 * API通信のタイムアウト設定を一元管理し、長時間接続を防止します。
 * 各外部APIに適切なタイムアウト値を設定することで、
 * リソースのハングアップを防ぎ、システムの安定性を確保します。
 *
 * @see https://newsapi.org/docs/get-started - NewsAPI
 * @see https://docs.anthropic.com/en/api/rate-limits - Claude API Rate Limits
 */

/**
 * タイムアウト設定の型定義
 *
 * @property timeoutMs - タイムアウト時間(ミリ秒)
 * @property description - 設定の説明
 * @property maxTimeoutMs - 許容される最大タイムアウト時間
 */
export interface TimeoutSetting {
  timeoutMs: number;
  description: string;
  maxTimeoutMs: number;
}

/**
 * サービス名の型定義
 */
export type ServiceName = 'newsApi' | 'claudeApi' | 'googleNewsRss' | 'batchProcess';

/**
 * タイムアウト設定マップ
 *
 * 各外部APIとバッチ処理のタイムアウト設定を定義します。
 * これらの値は実際のAPIクライアントで使用されます。
 */
export const TIMEOUT_CONFIG: Record<ServiceName, TimeoutSetting> = {
  // NewsAPI: 通常のAPI呼び出し
  newsApi: {
    timeoutMs: 10000, // 10秒
    description: 'NewsAPI v2への接続タイムアウト',
    maxTimeoutMs: 30000, // 最大30秒
  },

  // Claude API: AI処理は時間がかかる可能性がある
  claudeApi: {
    timeoutMs: 90000, // 90秒(AI処理のため長め)
    description: 'Claude API(Anthropic)への接続タイムアウト',
    maxTimeoutMs: 120000, // 最大120秒
  },

  // Google News RSS: RSSフィード取得
  googleNewsRss: {
    timeoutMs: 30000, // 30秒
    description: 'Google News RSSフィード取得タイムアウト',
    maxTimeoutMs: 30000, // 最大30秒
  },

  // バッチ処理全体: Requirements 1.8により5分以内に完了する必要がある
  batchProcess: {
    timeoutMs: 300000, // 5分
    description: 'バッチ処理全体のタイムアウト(Requirements: 1.8)',
    maxTimeoutMs: 300000, // 最大5分
  },
};

/**
 * 検証結果の設定情報
 */
export interface ValidatedConfig {
  timeoutMs: number;
  maxTimeoutMs: number;
  isValid: boolean;
  description: string;
}

/**
 * タイムアウト設定検証結果
 *
 * @property isValid - すべての設定が有効な場合true
 * @property configs - 各サービスの設定情報
 * @property invalidConfigs - 無効な設定のリスト
 */
export interface TimeoutConfigResult {
  isValid: boolean;
  configs: Record<ServiceName, ValidatedConfig>;
  invalidConfigs: ServiceName[];
}

/**
 * 指定したサービスのタイムアウト設定を取得する
 *
 * @param serviceName - サービス名
 * @returns タイムアウト設定(存在しない場合はundefined)
 *
 * @example
 * const config = getTimeoutConfig('newsApi');
 * console.log(config.timeoutMs); // 10000
 */
export function getTimeoutConfig(serviceName: ServiceName): TimeoutSetting | undefined {
  return TIMEOUT_CONFIG[serviceName];
}

/**
 * すべてのタイムアウト設定を検証する
 *
 * 各設定が適切な範囲内であることを確認します。
 * - タイムアウト値が0より大きいこと
 * - タイムアウト値が最大値以下であること
 *
 * @returns 検証結果
 *
 * @example
 * const result = validateTimeoutConfig();
 * if (!result.isValid) {
 *   console.error('無効な設定:', result.invalidConfigs);
 * }
 */
export function validateTimeoutConfig(): TimeoutConfigResult {
  const configs = {} as Record<ServiceName, ValidatedConfig>;
  const invalidConfigs: ServiceName[] = [];

  (Object.entries(TIMEOUT_CONFIG) as [ServiceName, TimeoutSetting][]).forEach(
    ([name, setting]) => {
      const isValid =
        setting.timeoutMs > 0 && setting.timeoutMs <= setting.maxTimeoutMs;

      configs[name] = {
        timeoutMs: setting.timeoutMs,
        maxTimeoutMs: setting.maxTimeoutMs,
        isValid,
        description: setting.description,
      };

      if (!isValid) {
        invalidConfigs.push(name);
      }
    }
  );

  return {
    isValid: invalidConfigs.length === 0,
    configs,
    invalidConfigs,
  };
}

/**
 * タイムアウト値をミリ秒から秒に変換する
 *
 * @param timeoutMs - タイムアウト時間(ミリ秒)
 * @returns タイムアウト時間(秒)
 */
export function toSeconds(timeoutMs: number): number {
  return timeoutMs / 1000;
}

/**
 * タイムアウト値を秒からミリ秒に変換する
 *
 * @param timeoutSeconds - タイムアウト時間(秒)
 * @returns タイムアウト時間(ミリ秒)
 */
export function toMilliseconds(timeoutSeconds: number): number {
  return timeoutSeconds * 1000;
}
