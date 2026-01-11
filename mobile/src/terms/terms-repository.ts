/**
 * Terms Repository
 * Task 21.1, 21.2, 21.3: 用語取得機能、キャッシュマネージャー統合、エラーハンドリング
 * Task 11: オフライン対応強化 - Supabase対応
 *
 * Supabaseから投資用語を取得し、キャッシュを管理するリポジトリ。
 * MVVM + Repositoryパターンに従い、データアクセスを抽象化します。
 *
 * Requirements:
 * - 5.1: 用語タブで3つ表示
 * - 5.3: 1日中同じ3用語表示
 * - 5.4: オフライン時キャッシュ済み用語表示
 * - 7.5: エラー時リトライオプション提供
 * - 10: オフライン対応強化
 *
 * @see design.md - Architecture - Terms Feature
 */

import { TermsData, SupabaseQueryResult } from '../supabase/types';
import { CacheValidationResult, CacheManager } from '../cache/cache-manager';
import {
  fetchTodayTermsForRepository,
  fetchBatchMetadataForCache,
  formatDateToJST,
} from '../supabase/queries';
import { SupabaseError, toSupabaseError, SupabaseErrorCode, ERROR_MESSAGES } from '../supabase/errors';
import { isOffline } from '../utils/network';

/**
 * データの取得元を示す型
 * - 'cache': ローカルキャッシュから取得
 * - 'supabase': Supabaseから取得
 */
export type TermsSource = 'cache' | 'supabase';

/**
 * 用語取得エラー情報
 * ViewModelでエラー表示に使用
 */
export interface TermsError {
  /** エラーコード */
  code: SupabaseErrorCode;
  /** ユーザー向けエラーメッセージ(日本語) */
  message: string;
  /** リトライ可能かどうか */
  retryable: boolean;
}

/**
 * 用語取得結果
 * 成功・失敗の両方のケースを型安全に表現
 */
export interface TermsResult {
  /** 取得成功かどうか */
  success: boolean;
  /** 用語データ(失敗時はnull) */
  data: TermsData | null;
  /** データの取得元 */
  source: TermsSource;
  /** エラー情報(失敗時のみ) */
  error?: TermsError;
}

/**
 * Supabaseから用語を取得する関数の型
 * テスト時にモック可能にするため型定義
 */
export type SupabaseFetcher = () => Promise<SupabaseQueryResult<TermsData>>;

/**
 * キャッシュを検証する関数の型
 * テスト時にモック可能にするため型定義
 */
export type CacheValidator = (
  type: 'news' | 'terms',
  dateStr: string
) => Promise<CacheValidationResult<TermsData>>;

/**
 * キャッシュを保存する関数の型
 * テスト時にモック可能にするため型定義
 */
export type CacheSetter = (
  type: 'news' | 'terms',
  dateStr: string,
  data: TermsData
) => Promise<void>;

/**
 * Terms Repository設定
 * 依存性注入(DI)によりテスタビリティを向上
 */
export interface TermsRepositoryConfig {
  /** Supabaseから用語を取得する関数 */
  supabaseFetcher?: SupabaseFetcher;
  /** キャッシュを検証する関数 */
  cacheValidator?: CacheValidator;
  /** キャッシュを保存する関数 */
  cacheSetter?: CacheSetter;
}

/**
 * Terms Repository クラス
 *
 * 投資用語データの取得とキャッシュ管理を担当します。
 * キャッシュ優先で動作し、キャッシュが無効な場合のみSupabaseにアクセスします。
 *
 * @example
 * ```typescript
 * const repository = createTermsRepository();
 * const result = await repository.getTodayTerms();
 * if (result.success && result.data) {
 *   result.data.terms.forEach(term => console.log(term.name));
 * }
 * ```
 */
export class TermsRepository {
  private supabaseFetcher: SupabaseFetcher;
  private cacheValidator: CacheValidator;
  private cacheSetter: CacheSetter;

  /**
   * TermsRepositoryのコンストラクタ
   * @param config - 設定(テスト用にモック関数を注入可能)
   */
  constructor(config?: TermsRepositoryConfig) {
    // Supabaseからデータを取得する関数
    this.supabaseFetcher = config?.supabaseFetcher || fetchTodayTermsForRepository;

    // キャッシュ検証: SupabaseのメタデータでlastUpdatedをチェック
    this.cacheValidator =
      config?.cacheValidator ||
      ((type, dateStr) => {
        const cacheManager = new CacheManager(fetchBatchMetadataForCache);
        return cacheManager.getValidatedCache<TermsData>(type, dateStr);
      });

    // キャッシュ保存
    this.cacheSetter =
      config?.cacheSetter ||
      ((type, dateStr, data) => {
        const cacheManager = new CacheManager(fetchBatchMetadataForCache);
        return cacheManager.setCache(type, dateStr, data);
      });
  }

  /**
   * 今日の用語を取得する
   *
   * 1. キャッシュを検証(メタデータでlastUpdated > cachedAtをチェック)
   * 2. キャッシュが有効な場合はキャッシュから返す
   * 3. キャッシュが無効な場合はSupabaseから取得
   * 4. Supabaseから取得した場合はキャッシュに保存
   *
   * Requirement 5.3: 1日中同じ3用語を表示
   * Requirement 5.4: オフライン時はキャッシュを使用
   * Requirement 10: オフライン対応強化
   *
   * @returns 用語取得結果
   */
  async getTodayTerms(): Promise<TermsResult> {
    const today = formatDateToJST(new Date());

    // Step 1: キャッシュを検証
    let cacheResult: CacheValidationResult<TermsData> | null = null;
    try {
      cacheResult = await this.cacheValidator('terms', today);

      // キャッシュが有効な場合はキャッシュから返す
      if (cacheResult.isValid && cacheResult.data) {
        console.log('[TermsRepository] Returning cached data');
        return {
          success: true,
          data: cacheResult.data,
          source: 'cache',
        };
      }
    } catch (error) {
      // キャッシュ検証エラーは無視してSupabaseから取得を試みる
      console.warn('[TermsRepository] Cache validation failed, falling back to Supabase:', error);
    }

    // Step 1.5: オフラインチェック (Requirement 5.4, 10)
    // キャッシュが無効でもオフラインの場合は古いキャッシュを使用
    if (isOffline()) {
      console.log('[TermsRepository] Offline mode detected');

      // キャッシュデータがあればそれを返す(isValidがfalseでも)
      if (cacheResult?.data) {
        console.log('[TermsRepository] Returning stale cache data (offline fallback)');
        return {
          success: true,
          data: cacheResult.data,
          source: 'cache',
        };
      }

      // キャッシュもない場合はエラー
      console.warn('[TermsRepository] No cached data available while offline');
      return {
        success: false,
        data: null,
        source: 'cache',
        error: {
          code: 'OFFLINE',
          message: ERROR_MESSAGES.OFFLINE,
          retryable: true,
        },
      };
    }

    // Step 2: Supabaseからデータを取得
    try {
      console.log('[TermsRepository] Fetching from Supabase');
      const supabaseResult = await this.supabaseFetcher();

      if (!supabaseResult.exists || !supabaseResult.data) {
        // データが存在しない場合(まだバッチが実行されていない等)
        return {
          success: true,
          data: null,
          source: 'supabase',
        };
      }

      // Step 3: キャッシュに保存(エラーは無視)
      try {
        await this.cacheSetter('terms', today, supabaseResult.data);
        console.log('[TermsRepository] Data cached successfully');
      } catch (cacheError) {
        console.warn('[TermsRepository] Failed to cache data:', cacheError);
      }

      return {
        success: true,
        data: supabaseResult.data,
        source: 'supabase',
      };
    } catch (error) {
      // Supabaseエラーをハンドリング
      const supabaseError =
        error instanceof SupabaseError ? error : toSupabaseError(error);

      console.error('[TermsRepository] Failed to fetch terms:', supabaseError);

      return {
        success: false,
        data: null,
        source: 'supabase',
        error: {
          code: supabaseError.code,
          message: supabaseError.message,
          retryable: supabaseError.retryable,
        },
      };
    }
  }
}

/**
 * デフォルトのTermsRepositoryを作成する
 * 本番環境用のファクトリ関数
 *
 * @returns TermsRepository
 */
export function createTermsRepository(): TermsRepository {
  return new TermsRepository();
}
