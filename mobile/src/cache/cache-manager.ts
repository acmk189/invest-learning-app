/**
 * キャッシュマネージャー
 * Task 2.3: キャッシュ管理システム実装
 *
 * AsyncStorageを使用したローカルキャッシュ管理
 * - 日付ベースのキャッシュキー生成
 * - メタデータによるキャッシュ有効性チェック(案B)
 * - オフライン時のデータ取得(1秒以内)
 * - 古いキャッシュの自動削除
 *
 * Requirements: 2.5, 2.6, 5.4, 7.2
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheType, CacheKey, CacheEntry, BatchMetadata, CACHE_KEY_PREFIX } from './types';

/**
 * JSTタイムゾーンオフセット(ミリ秒)
 */
const JST_OFFSET = 9 * 60 * 60 * 1000;

/**
 * 日付をJSTのYYYY-MM-DD形式に変換する
 * @param date - 変換する日付
 * @returns YYYY-MM-DD形式の文字列
 */
function formatDateToJST(date: Date): string {
  const jstDate = new Date(date.getTime() + JST_OFFSET);
  return jstDate.toISOString().split('T')[0];
}

/**
 * キャッシュキーから日付を抽出する
 * @param key - キャッシュキー
 * @returns 日付文字列(YYYY-MM-DD形式)またはnull
 */
function extractDateFromCacheKey(key: string): string | null {
  const match = key.match(/cache_(news|terms)_(\d{4}-\d{2}-\d{2})/);
  return match ? match[2] : null;
}

/**
 * メタデータ取得関数の型
 */
export type MetadataFetcher = () => Promise<BatchMetadata | null>;

/**
 * キャッシュ検証結果の型
 */
export interface CacheValidationResult<T> {
  /** キャッシュデータ(無効な場合はnull) */
  data: T | null;
  /** キャッシュが有効かどうか */
  isValid: boolean;
}

/**
 * キャッシュマネージャークラス
 *
 * AsyncStorageを使用してニュース・用語データをローカルにキャッシュします。
 * メタデータ(metadata/batch)のlastUpdatedとキャッシュのcachedAtを比較し、
 * 新しいデータがある場合のみキャッシュを無効化します。
 */
export class CacheManager {
  private metadataFetcher: MetadataFetcher;

  /**
   * CacheManagerのコンストラクタ
   * @param metadataFetcher - Firestoreからメタデータを取得する関数(DI用)
   */
  constructor(metadataFetcher?: MetadataFetcher) {
    this.metadataFetcher = metadataFetcher || (async () => null);
  }

  /**
   * キャッシュキーを生成する
   * @param type - キャッシュの種類('news' | 'terms')
   * @param dateStr - 日付文字列(YYYY-MM-DD形式)
   * @returns キャッシュキー
   */
  static generateCacheKey(type: CacheType, dateStr: string): CacheKey {
    return `${CACHE_KEY_PREFIX}${type}_${dateStr}` as CacheKey;
  }

  /**
   * 今日の日付でキャッシュキーを生成する
   * @param type - キャッシュの種類('news' | 'terms')
   * @returns 今日の日付のキャッシュキー
   */
  static generateTodayCacheKey(type: CacheType): CacheKey {
    const today = formatDateToJST(new Date());
    return CacheManager.generateCacheKey(type, today);
  }

  /**
   * データをキャッシュに保存する
   * @param type - キャッシュの種類
   * @param dateStr - 日付文字列(YYYY-MM-DD形式)
   * @param data - 保存するデータ
   */
  async setCache<T>(type: CacheType, dateStr: string, data: T): Promise<void> {
    const key = CacheManager.generateCacheKey(type, dateStr);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
    };

    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      // エラーをログに記録するが、例外はスローしない(キャッシュ失敗はアプリ動作に影響しない)
      console.error('Cache write error:', error);
    }
  }

  /**
   * 今日のデータをキャッシュに保存する
   * @param type - キャッシュの種類
   * @param data - 保存するデータ
   */
  async setTodayCache<T>(type: CacheType, data: T): Promise<void> {
    const today = formatDateToJST(new Date());
    await this.setCache(type, today, data);
  }

  /**
   * キャッシュエントリを取得する(メタデータチェックなし)
   * @param type - キャッシュの種類
   * @param dateStr - 日付文字列(YYYY-MM-DD形式)
   * @returns キャッシュエントリ、存在しない場合はnull
   */
  async getCacheEntry<T>(type: CacheType, dateStr: string): Promise<CacheEntry<T> | null> {
    const key = CacheManager.generateCacheKey(type, dateStr);

    try {
      const value = await AsyncStorage.getItem(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as CacheEntry<T>;
    } catch (error) {
      // JSONパースエラーなどの場合はnullを返す
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * キャッシュを検証付きで取得する(メタデータチェックあり)
   *
   * 1. キャッシュが存在しない場合 → { data: null, isValid: false }
   * 2. メタデータ取得失敗(オフライン)の場合 → キャッシュをそのまま返す
   * 3. lastUpdated <= cachedAt の場合 → キャッシュを返す(有効)
   * 4. lastUpdated > cachedAt の場合 → キャッシュを削除し { data: null, isValid: false }
   *
   * @param type - キャッシュの種類
   * @param dateStr - 日付文字列(YYYY-MM-DD形式)
   * @returns キャッシュ検証結果
   */
  async getValidatedCache<T>(
    type: CacheType,
    dateStr: string
  ): Promise<CacheValidationResult<T>> {
    const entry = await this.getCacheEntry<T>(type, dateStr);

    if (!entry) {
      return { data: null, isValid: false };
    }

    // メタデータを取得
    const metadata = await this.metadataFetcher();

    // オフライン時(メタデータ取得失敗)はキャッシュをそのまま使用
    if (!metadata) {
      return { data: entry.data, isValid: true };
    }

    // メタデータのlastUpdatedとキャッシュのcachedAtを比較
    const lastUpdated =
      type === 'news' ? metadata.newsLastUpdated : metadata.termsLastUpdated;

    if (lastUpdated > entry.cachedAt) {
      // 新しいデータがある場合、キャッシュを削除
      await this.removeCache(type, dateStr);
      return { data: null, isValid: false };
    }

    // キャッシュが有効
    return { data: entry.data, isValid: true };
  }

  /**
   * 今日のキャッシュを検証付きで取得する
   * @param type - キャッシュの種類
   * @returns キャッシュ検証結果
   */
  async getTodayValidatedCache<T>(type: CacheType): Promise<CacheValidationResult<T>> {
    const today = formatDateToJST(new Date());
    return this.getValidatedCache<T>(type, today);
  }

  /**
   * 指定したキャッシュを削除する
   * @param type - キャッシュの種類
   * @param dateStr - 日付文字列(YYYY-MM-DD形式)
   */
  async removeCache(type: CacheType, dateStr: string): Promise<void> {
    const key = CacheManager.generateCacheKey(type, dateStr);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  /**
   * 古いキャッシュを削除する(今日以外のキャッシュを削除)
   */
  async clearOldCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
      const today = formatDateToJST(new Date());

      const keysToRemove: string[] = [];

      for (const key of cacheKeys) {
        const dateStr = extractDateFromCacheKey(key);
        if (dateStr && dateStr !== today) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error('Cache clear old error:', error);
    }
  }

  /**
   * 全てのキャッシュを削除する
   */
  async clearAllCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  }

  /**
   * キャッシュエントリが存在するかどうかを確認する
   * @param type - キャッシュの種類
   * @param dateStr - 日付文字列(YYYY-MM-DD形式)
   * @returns キャッシュエントリが存在する場合はtrue
   */
  async hasCacheEntry(type: CacheType, dateStr: string): Promise<boolean> {
    const entry = await this.getCacheEntry(type, dateStr);
    return entry !== null;
  }

  /**
   * 今日のキャッシュエントリが存在するかどうかを確認する
   * @param type - キャッシュの種類
   * @returns 今日のキャッシュエントリが存在する場合はtrue
   */
  async hasTodayCacheEntry(type: CacheType): Promise<boolean> {
    const today = formatDateToJST(new Date());
    return this.hasCacheEntry(type, today);
  }
}
