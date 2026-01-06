/**
 * News Repository
 * Task 17.1, 17.2, 17.3: ニュース取得機能、キャッシュマネージャー統合、エラーハンドリング
 *
 * Firestoreからニュースを取得し、キャッシュを管理するリポジトリ。
 * MVVM + Repositoryパターンに従い、データアクセスを抽象化します。
 *
 * Requirements:
 * - 2.1: アプリ起動時当日ニュース表示
 * - 2.4: 1日中同じニュース表示
 * - 2.5: オフライン時キャッシュ済みニュース表示
 * - 7.5: エラー時リトライオプション提供
 *
 * @see design.md - Architecture - News Feature
 */

import { NewsData, FirestoreQueryResult } from '../firestore/types';
import { CacheValidationResult, CacheManager } from '../cache/cache-manager';
import { fetchTodayNews, fetchBatchMetadata, formatDateToJST } from '../firestore/queries';
import { FirestoreError, toFirestoreError, FirestoreErrorCode } from '../firestore/errors';

/**
 * データの取得元を示す型
 * - 'cache': ローカルキャッシュから取得
 * - 'firestore': Firestoreから取得
 */
export type NewsSource = 'cache' | 'firestore';

/**
 * ニュース取得エラー情報
 * ViewModelでエラー表示に使用
 */
export interface NewsError {
  /** エラーコード */
  code: FirestoreErrorCode;
  /** ユーザー向けエラーメッセージ（日本語） */
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
  /** ニュースデータ（失敗時はnull） */
  data: NewsData | null;
  /** データの取得元 */
  source: NewsSource;
  /** エラー情報（失敗時のみ） */
  error?: NewsError;
}

/**
 * Firestoreからニュースを取得する関数の型
 * テスト時にモック可能にするため型定義
 */
export type FirestoreFetcher = () => Promise<FirestoreQueryResult<NewsData>>;

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
 * News Repository設定
 * 依存性注入（DI）によりテスタビリティを向上
 */
export interface NewsRepositoryConfig {
  /** Firestoreからニュースを取得する関数 */
  firestoreFetcher?: FirestoreFetcher;
  /** キャッシュを検証する関数 */
  cacheValidator?: CacheValidator;
  /** キャッシュを保存する関数 */
  cacheSetter?: CacheSetter;
}

/**
 * News Repository クラス
 *
 * ニュースデータの取得とキャッシュ管理を担当します。
 * キャッシュ優先で動作し、キャッシュが無効な場合のみFirestoreにアクセスします。
 *
 * @example
 * ```typescript
 * const repository = createNewsRepository();
 * const result = await repository.getTodayNews();
 * if (result.success && result.data) {
 *   console.log(result.data.worldNews.title);
 * }
 * ```
 */
export class NewsRepository {
  private firestoreFetcher: FirestoreFetcher;
  private cacheValidator: CacheValidator;
  private cacheSetter: CacheSetter;

  /**
   * NewsRepositoryのコンストラクタ
   * @param config - 設定（テスト用にモック関数を注入可能）
   */
  constructor(config?: NewsRepositoryConfig) {
    this.firestoreFetcher = config?.firestoreFetcher || fetchTodayNews;
    this.cacheValidator =
      config?.cacheValidator ||
      ((type, dateStr) => {
        const cacheManager = new CacheManager(fetchBatchMetadata);
        return cacheManager.getValidatedCache<NewsData>(type, dateStr);
      });
    this.cacheSetter =
      config?.cacheSetter ||
      ((type, dateStr, data) => {
        const cacheManager = new CacheManager(fetchBatchMetadata);
        return cacheManager.setCache(type, dateStr, data);
      });
  }

  /**
   * 今日のニュースを取得する
   *
   * 1. キャッシュを検証（メタデータでlastUpdated > cachedAtをチェック）
   * 2. キャッシュが有効な場合はキャッシュから返す
   * 3. キャッシュが無効な場合はFirestoreから取得
   * 4. Firestoreから取得した場合はキャッシュに保存
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
        console.log('[NewsRepository] Returning cached data');
        return {
          success: true,
          data: cacheResult.data,
          source: 'cache',
        };
      }
    } catch (error) {
      // キャッシュ検証エラーは無視してFirestoreから取得を試みる
      console.warn('[NewsRepository] Cache validation failed, falling back to Firestore:', error);
    }

    // Step 2: Firestoreからデータを取得
    try {
      console.log('[NewsRepository] Fetching from Firestore');
      const firestoreResult = await this.firestoreFetcher();

      if (!firestoreResult.exists || !firestoreResult.data) {
        // データが存在しない場合（まだバッチが実行されていない等）
        return {
          success: true,
          data: null,
          source: 'firestore',
        };
      }

      // Step 3: キャッシュに保存（エラーは無視）
      try {
        await this.cacheSetter('news', today, firestoreResult.data);
        console.log('[NewsRepository] Data cached successfully');
      } catch (cacheError) {
        console.warn('[NewsRepository] Failed to cache data:', cacheError);
      }

      return {
        success: true,
        data: firestoreResult.data,
        source: 'firestore',
      };
    } catch (error) {
      // Firestoreエラーをハンドリング
      const firestoreError =
        error instanceof FirestoreError ? error : toFirestoreError(error);

      console.error('[NewsRepository] Failed to fetch news:', firestoreError);

      return {
        success: false,
        data: null,
        source: 'firestore',
        error: {
          code: firestoreError.code,
          message: firestoreError.message,
          retryable: firestoreError.retryable,
        },
      };
    }
  }
}

/**
 * デフォルトのNewsRepositoryを作成する
 * 本番環境用のファクトリ関数
 *
 * @returns NewsRepository
 */
export function createNewsRepository(): NewsRepository {
  return new NewsRepository();
}
