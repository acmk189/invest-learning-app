/**
 * 環境変数管理ユーティリティ
 *
 * Task 30.1: 環境変数管理実装
 * Task 12: Firebase依存の完全削除 - Supabase対応
 * Requirements: 9.1, 9.2
 *
 * NewsAPIキー、Claude APIキー、Supabaseキーなどの環境変数を
 * 安全に管理し、検証するための統合ユーティリティです。
 *
 * すべてのAPIキーは環境変数で管理され、コード内にハードコーディングしません。
 *
 * @see https://vercel.com/docs/projects/environment-variables - Vercel環境変数ドキュメント
 */

/**
 * 環境変数の名前
 *
 * Supabase、Claude API、NewsAPI関連の環境変数を含みます。
 */
export type EnvVarName =
  | 'CLAUDE_API_KEY'
  | 'NEWS_API_KEY'
  | 'CRON_SECRET'
  | 'SUPABASE_URL'
  | 'SUPABASE_PUBLISHABLE_KEY'
  | 'SUPABASE_SECRET_KEY'
  | 'LOCAL_SUPABASE_URL'
  | 'LOCAL_SUPABASE_PUBLISHABLE_KEY'
  | 'LOCAL_SUPABASE_SECRET_KEY';

/**
 * 環境変数の設定情報
 *
 * @property description - 環境変数の説明(日本語)
 * @property required - 必須かどうか
 * @property example - 設定例
 */
export interface EnvVarInfo {
  description: string;
  required: boolean;
  example: string;
}

/**
 * 環境変数の設定マップ
 *
 * 各環境変数の説明、必須フラグ、設定例を定義します。
 * この情報は.env.exampleの生成やヘルスチェックに使用されます。
 */
export const ENV_VAR_CONFIG: Record<EnvVarName, EnvVarInfo> = {
  // Claude API(Anthropic)用の環境変数
  CLAUDE_API_KEY: {
    description: 'Claude API(Anthropic)のAPIキー',
    required: true,
    example: 'sk-ant-api03-xxxxxxxx',
  },

  // NewsAPI用の環境変数
  NEWS_API_KEY: {
    description: 'NewsAPI v2のAPIキー(無料枠: 100リクエスト/日)',
    required: true,
    example: 'your-newsapi-key',
  },

  // Vercel Cron認証用の環境変数
  CRON_SECRET: {
    description: 'Vercel Cron Jobsの認証シークレット',
    required: true,
    example: 'generated-secure-secret-64-chars-hex',
  },

  // Supabase用の環境変数(本番環境)
  // 2025年以降の新しいAPIキー形式に対応
  // 参考: https://github.com/orgs/supabase/discussions/29260
  SUPABASE_URL: {
    description: 'Supabase プロジェクトURL',
    required: true,
    example: 'https://your-project.supabase.co',
  },
  SUPABASE_PUBLISHABLE_KEY: {
    description: 'Supabase publishable key(クライアントサイド用、旧anon key)',
    required: false, // クライアントサイドでのみ必要
    example: 'sb_publishable_xxxxxxxx',
  },
  SUPABASE_SECRET_KEY: {
    description: 'Supabase secret key(サーバーサイド用、旧service_role key)',
    required: true,
    example: 'sb_secret_xxxxxxxx',
  },

  // Supabase用の環境変数(ローカル開発環境)
  LOCAL_SUPABASE_URL: {
    description: 'ローカルSupabase URL(Docker)',
    required: false,
    example: 'http://127.0.0.1:54321',
  },
  LOCAL_SUPABASE_PUBLISHABLE_KEY: {
    description: 'ローカルSupabase publishable key(supabase start時に生成)',
    required: false,
    example: 'sb_publishable_xxxxxxxx',
  },
  LOCAL_SUPABASE_SECRET_KEY: {
    description: 'ローカルSupabase secret key(supabase start時に生成)',
    required: false,
    example: 'sb_secret_xxxxxxxx',
  },
};

/**
 * 環境変数のステータス
 *
 * @property isConfigured - 環境変数が設定されているか
 * @property description - 環境変数の説明
 */
export interface EnvVarStatus {
  isConfigured: boolean;
  description: string;
}

/**
 * 環境変数検証結果
 *
 * @property isValid - すべての必須環境変数が設定されている場合true
 * @property missingVars - 未設定の必須環境変数名のリスト
 * @property configuredVars - 設定済みの環境変数名のリスト
 */
export interface EnvVarValidationResult {
  isValid: boolean;
  missingVars: EnvVarName[];
  configuredVars: EnvVarName[];
}

/**
 * 環境変数が設定されているか確認する
 *
 * 空文字列や空白のみの値は未設定として扱います。
 *
 * @param value - 環境変数の値
 * @returns 有効な値が設定されている場合true
 */
function isEnvVarSet(value: string | undefined): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  return value.trim() !== '';
}

/**
 * すべての必須環境変数を検証する
 *
 * 各環境変数が設定されているか確認し、検証結果を返します。
 * この関数はアプリケーション起動時やヘルスチェック時に使用します。
 *
 * @returns 検証結果(isValid, missingVars, configuredVars)
 *
 * @example
 * const result = validateAllEnvVars();
 * if (!result.isValid) {
 *   console.error('未設定の環境変数:', result.missingVars);
 * }
 */
export function validateAllEnvVars(): EnvVarValidationResult {
  const missingVars: EnvVarName[] = [];
  const configuredVars: EnvVarName[] = [];

  // すべての必須環境変数をチェック
  (Object.keys(ENV_VAR_CONFIG) as EnvVarName[]).forEach((varName) => {
    const config = ENV_VAR_CONFIG[varName];
    const value = process.env[varName];

    if (config.required) {
      if (isEnvVarSet(value)) {
        configuredVars.push(varName);
      } else {
        missingVars.push(varName);
      }
    }
  });

  return {
    isValid: missingVars.length === 0,
    missingVars,
    configuredVars,
  };
}

/**
 * 各環境変数のステータスを取得する
 *
 * すべての環境変数について、設定状態と説明を返します。
 * この関数はヘルスチェックエンドポイントで使用します。
 *
 * @returns 環境変数名をキーとしたステータスマップ
 *
 * @example
 * const status = getEnvVarStatus();
 * console.log(status.CLAUDE_API_KEY.isConfigured); // true or false
 */
export function getEnvVarStatus(): Record<EnvVarName, EnvVarStatus> {
  const status = {} as Record<EnvVarName, EnvVarStatus>;

  (Object.keys(ENV_VAR_CONFIG) as EnvVarName[]).forEach((varName) => {
    const config = ENV_VAR_CONFIG[varName];
    const value = process.env[varName];

    status[varName] = {
      isConfigured: isEnvVarSet(value),
      description: config.description,
    };
  });

  return status;
}

/**
 * 環境変数検証エラーメッセージを生成する
 *
 * 未設定の環境変数がある場合、詳細なエラーメッセージを生成します。
 *
 * @param missingVars - 未設定の環境変数名のリスト
 * @returns エラーメッセージ文字列
 */
export function generateEnvVarErrorMessage(missingVars: EnvVarName[]): string {
  if (missingVars.length === 0) {
    return '';
  }

  const details = missingVars.map((varName) => {
    const config = ENV_VAR_CONFIG[varName];
    return `  - ${varName}: ${config.description}`;
  });

  return `以下の必須環境変数が設定されていません:\n${details.join('\n')}`;
}

/**
 * Supabase環境変数の設定結果
 *
 * 2025年以降の新しいAPIキー形式(publishable/secret)に対応
 */
export interface SupabaseEnvConfig {
  url: string;
  secretKey: string;
  publishableKey?: string;
}

/**
 * Supabase環境変数を取得する
 *
 * NODE_ENVに応じてローカル環境または本番環境の値を返します。
 * - development: LOCAL_SUPABASE_* を優先、なければ SUPABASE_*
 * - production: SUPABASE_* を使用
 *
 * 2025年以降の新しいAPIキー形式(publishable/secret)に対応
 *
 * @returns Supabase接続設定
 * @throws 必要な環境変数が設定されていない場合
 */
export function getSupabaseEnvConfig(): SupabaseEnvConfig {
  const isLocal = process.env.NODE_ENV === 'development';

  // ローカル開発環境の場合
  if (isLocal) {
    const localUrl = process.env.LOCAL_SUPABASE_URL;
    const localSecretKey = process.env.LOCAL_SUPABASE_SECRET_KEY;
    const localPublishableKey = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY;

    // ローカル環境変数が設定されている場合はそれを使用
    if (localUrl && localSecretKey) {
      return {
        url: localUrl,
        secretKey: localSecretKey,
        publishableKey: localPublishableKey,
      };
    }
    // ローカル環境変数がない場合は本番環境変数にフォールバック
  }

  // 本番環境(またはフォールバック)
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !secretKey) {
    const missing: string[] = [];
    if (!url) missing.push('SUPABASE_URL');
    if (!secretKey) missing.push('SUPABASE_SECRET_KEY');
    throw new Error(
      `Supabase環境変数が不足しています: ${missing.join(', ')}`
    );
  }

  return {
    url,
    secretKey,
    publishableKey,
  };
}

/**
 * Supabase環境変数が設定されているか確認する
 *
 * @returns Supabase環境変数が設定されている場合true
 */
export function isSupabaseConfigured(): boolean {
  const isLocal = process.env.NODE_ENV === 'development';

  if (isLocal) {
    // ローカル環境変数がある場合
    if (
      process.env.LOCAL_SUPABASE_URL &&
      process.env.LOCAL_SUPABASE_SECRET_KEY
    ) {
      return true;
    }
  }

  // 本番環境変数をチェック
  return !!(
    process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
  );
}
