/**
 * Terms Repository
 * Task 21.1, 21.2, 21.3: 用語取得機能、キャッシュマネージャー統合、エラーハンドリング
 *
 * Firestoreから投資用語を取得し、キャッシュを管理するリポジトリ。
 * MVVM + Repositoryパターンに従い、データアクセスを抽象化します。
 *
 * Requirements:
 * - 5.1: 用語タブで3つ表示
 * - 5.3: 1日中同じ3用語表示
 * - 5.4: オフライン時キャッシュ済み用語表示
 * - 7.5: エラー時リトライオプション提供
 *
 * @see design.md - Architecture - Terms Feature
 */

import { TermsData, FirestoreQueryResult } from '../firestore/types';
import { CacheValidationResult, CacheManager } from '../cache/cache-manager';
import { fetchTodayTerms, fetchBatchMetadata, formatDateToJST } from '../firestore/queries';
import { FirestoreError, toFirestoreError, FirestoreErrorCode } from '../firestore/errors';

/**
 * データの取得元を示す型
 * - 'cache': ローカルキャッシュから取得
 * - 'firestore': Firestoreから取得
 */
export type TermsSource = 'cache' | 'firestore';

/**
 * 用語取得エラー情報
 * ViewModelでエラー表示に使用
 */
export interface TermsError {
  /** エラーコード */
  code: FirestoreErrorCode;
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
 * Firestoreから用語を取得する関数の型
 * テスト時にモック可能にするため型定義
 */
export type FirestoreFetcher = () => Promise<FirestoreQueryResult<TermsData>>;

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
  /** Firestoreから用語を取得する関数 */
  firestoreFetcher?: FirestoreFetcher;
  /** キャッシュを検証する関数 */
  cacheValidator?: CacheValidator;
  /** キャッシュを保存する関数 */
  cacheSetter?: CacheSetter;
}

/**
 * Terms Repository クラス
 *
 * 投資用語データの取得とキャッシュ管理を担当します。
 * キャッシュ優先で動作し、キャッシュが無効な場合のみFirestoreにアクセスします。
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
  private firestoreFetcher: FirestoreFetcher;
  private cacheValidator: CacheValidator;
  private cacheSetter: CacheSetter;

  /**
   * TermsRepositoryのコンストラクタ
   * @param config - 設定(テスト用にモック関数を注入可能)
   */
  constructor(config?: TermsRepositoryConfig) {
    this.firestoreFetcher = config?.firestoreFetcher || fetchTodayTerms;
    this.cacheValidator =
      config?.cacheValidator ||
      ((type, dateStr) => {
        // CacheManagerを使用してキャッシュを検証
        const cacheManager = new CacheManager(fetchBatchMetadata);
        return cacheManager.getValidatedCache<TermsData>(type, dateStr);
      });
    this.cacheSetter =
      config?.cacheSetter ||
      ((type, dateStr, data) => {
        // CacheManagerを使用してキャッシュを保存
        const cacheManager = new CacheManager(fetchBatchMetadata);
        return cacheManager.setCache(type, dateStr, data);
      });
  }

  /**
   * 今日の用語を取得する
   *
   * 1. キャッシュを検証(メタデータでlastUpdated > cachedAtをチェック)
   * 2. キャッシュが有効な場合はキャッシュから返す
   * 3. キャッシュが無効な場合はFirestoreから取得
   * 4. Firestoreから取得した場合はキャッシュに保存
   *
   * Requirement 5.3: 1日中同じ3用語を表示
   * Requirement 5.4: オフライン時はキャッシュを使用
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
      // キャッシュ検証エラーは無視してFirestoreから取得を試みる
      console.warn('[TermsRepository] Cache validation failed, falling back to Firestore:', error);
    }

    // Step 2: Firestoreからデータを取得
    try {
      console.log('[TermsRepository] Fetching from Firestore');
      const firestoreResult = await this.firestoreFetcher();

      if (!firestoreResult.exists || !firestoreResult.data) {
        // データが存在しない場合(まだバッチが実行されていない等)
        return {
          success: true,
          data: null,
          source: 'firestore',
        };
      }

      // Step 3: キャッシュに保存(エラーは無視)
      try {
        await this.cacheSetter('terms', today, firestoreResult.data);
        console.log('[TermsRepository] Data cached successfully');
      } catch (cacheError) {
        console.warn('[TermsRepository] Failed to cache data:', cacheError);
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

      console.error('[TermsRepository] Failed to fetch terms:', firestoreError);

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
 * デフォルトのTermsRepositoryを作成する
 * 本番環境用のファクトリ関数
 *
 * @returns TermsRepository
 */
export function createTermsRepository(): TermsRepository {
  return new TermsRepository();
}
