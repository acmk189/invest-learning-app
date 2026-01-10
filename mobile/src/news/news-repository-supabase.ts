/**
 * News Repository (Supabase版)
 * Task 10.1: NewsRepository移行
 *
 * Supabaseからニュースを取得し、キャッシュを管理するリポジトリ。
 * MVVM + Repositoryパターンに従い、データアクセスを抽象化します。
 *
 * Requirements:
 * - 9: フロントエンドRepository移行
 * - 2.1: アプリ起動時当日ニュース表示
 * - 2.4: 1日中同じニュース表示
 * - 2.5: オフライン時キャッシュ済みニュース表示
 * - 7.5: エラー時リトライオプション提供
 *
 * @see design.md - Architecture - News Feature
 */

import { NewsData, SupabaseQueryResult } from '../supabase/types';
import { CacheValidationResult, CacheManager } from '../cache/cache-manager';
import {
  fetchTodayNewsForRepository,
  fetchBatchMetadataForCache,
  formatDateToJST,
} from '../supabase/queries';
import {
  SupabaseError,
  SupabaseErrorCode,
  toSupabaseError,
} from '../supabase/errors';

/**
 * データの取得元を示す型
 * - 'cache': ローカルキャッシュから取得
 * - 'supabase': Supabaseから取得
 */
export type NewsSource = 'cache' | 'supabase';

/**
 * ニュース取得エラー情報
 * ViewModelでエラー表示に使用
 */
export interface NewsError {
  /** エラーコード */
  code: SupabaseErrorCode;
  /** ユーザー向けエラーメッセージ (日本語) */
  message: string;
  /** リトライ可能かどうか */
  retryable: boolean;
}

/**
 * ニュース取得結果
 * 成功・失敗の両方のケースを型安全に表現
 */
export interface NewsResult {
  /** 取得成功かどうか */
  success: boolean;
  /** ニュースデータ (失敗時はnull) */
  data: NewsData | null;
  /** データの取得元 */
  source: NewsSource;
  /** エラー情報 (失敗時のみ) */
  error?: NewsError;
}

/**
 * Supabaseからニュースを取得する関数の型
 * テスト時にモック可能にするため型定義
 */
export type SupabaseFetcher = () => Promise<SupabaseQueryResult<NewsData>>;

/**
 * キャッシュを検証する関数の型
 * テスト時にモック可能にするため型定義
 */
export type CacheValidator = (
  type: 'news' | 'terms',
  dateStr: string
) => Promise<CacheValidationResult<NewsData>>;

/**
 * キャッシュを保存する関数の型
 * テスト時にモック可能にするため型定義
 */
export type CacheSetter = (
  type: 'news' | 'terms',
  dateStr: string,
  data: NewsData
) => Promise<void>;

/**
 * News Repository設定 (Supabase版)
 * 依存性注入 (DI) によりテスタビリティを向上
 */
export interface NewsRepositorySupabaseConfig {
  /** Supabaseからニュースを取得する関数 */
  supabaseFetcher?: SupabaseFetcher;
  /** キャッシュを検証する関数 */
  cacheValidator?: CacheValidator;
  /** キャッシュを保存する関数 */
  cacheSetter?: CacheSetter;
}

/**
 * News Repository クラス (Supabase版)
 *
 * ニュースデータの取得とキャッシュ管理を担当します。
 * キャッシュ優先で動作し、キャッシュが無効な場合のみSupabaseにアクセスします。
 *
 * @example
 * ```typescript
 * const repository = createNewsRepositorySupabase();
 * const result = await repository.getTodayNews();
 * if (result.success && result.data) {
 *   console.log(result.data.worldNews.title);
 * }
 * ```
 */
export class NewsRepositorySupabase {
  private supabaseFetcher: SupabaseFetcher;
  private cacheValidator: CacheValidator;
  private cacheSetter: CacheSetter;

  /**
   * NewsRepositorySupabaseのコンストラクタ
   * @param config - 設定 (テスト用にモック関数を注入可能)
   */
  constructor(config?: NewsRepositorySupabaseConfig) {
    this.supabaseFetcher = config?.supabaseFetcher || fetchTodayNewsForRepository;
    this.cacheValidator =
      config?.cacheValidator ||
      ((type, dateStr) => {
        // CacheManagerを使用してキャッシュを検証
        // fetchBatchMetadataForCacheはSupabaseからメタデータを取得
        const cacheManager = new CacheManager(fetchBatchMetadataForCache);
        return cacheManager.getValidatedCache<NewsData>(type, dateStr);
      });
    this.cacheSetter =
      config?.cacheSetter ||
      ((type, dateStr, data) => {
        // CacheManagerを使用してキャッシュを保存
        const cacheManager = new CacheManager(fetchBatchMetadataForCache);
        return cacheManager.setCache(type, dateStr, data);
      });
  }

  /**
   * 今日のニュースを取得する
   *
   * 1. キャッシュを検証 (メタデータでlastUpdated > cachedAtをチェック)
   * 2. キャッシュが有効な場合はキャッシュから返す
   * 3. キャッシュが無効な場合はSupabaseから取得
   * 4. Supabaseから取得した場合はキャッシュに保存
   *
   * Requirement 2.4: 1日中同じニュース内容を表示
   * Requirement 2.5: オフライン時はキャッシュを使用
   *
   * @returns ニュース取得結果
   */
  async getTodayNews(): Promise<NewsResult> {
    const today = formatDateToJST(new Date());

    // Step 1: キャッシュを検証
    let cacheResult: CacheValidationResult<NewsData> | null = null;
    try {
      cacheResult = await this.cacheValidator('news', today);

      // キャッシュが有効な場合はキャッシュから返す
      if (cacheResult.isValid && cacheResult.data) {
        console.log('[NewsRepositorySupabase] Returning cached data');
        return {
          success: true,
          data: cacheResult.data,
          source: 'cache',
        };
      }
    } catch (error) {
      // キャッシュ検証エラーは無視してSupabaseから取得を試みる
      console.warn('[NewsRepositorySupabase] Cache validation failed, falling back to Supabase:', error);
    }

    // Step 2: Supabaseからデータを取得
    try {
      console.log('[NewsRepositorySupabase] Fetching from Supabase');
      const supabaseResult = await this.supabaseFetcher();

      if (!supabaseResult.exists || !supabaseResult.data) {
        // データが存在しない場合 (まだバッチが実行されていない等)
        return {
          success: true,
          data: null,
          source: 'supabase',
        };
      }

      // Step 3: キャッシュに保存 (エラーは無視)
      try {
        await this.cacheSetter('news', today, supabaseResult.data);
        console.log('[NewsRepositorySupabase] Data cached successfully');
      } catch (cacheError) {
        console.warn('[NewsRepositorySupabase] Failed to cache data:', cacheError);
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

      console.error('[NewsRepositorySupabase] Failed to fetch news:', supabaseError);

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
 * デフォルトのNewsRepositorySupabaseを作成する
 * 本番環境用のファクトリ関数
 *
 * @returns NewsRepositorySupabase
 */
export function createNewsRepositorySupabase(): NewsRepositorySupabase {
  return new NewsRepositorySupabase();
}
