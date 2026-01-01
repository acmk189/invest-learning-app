/**
 * キャッシュマネージャー
 * Task 2.3: キャッシュ管理システム実装
 *
 * AsyncStorageを使用したローカルキャッシュ管理
 * - 日付ベースのキャッシュキー生成
 * - 当日のみ有効なキャッシュ管理
 * - オフライン時のデータ取得（1秒以内）
 * - 期限切れキャッシュの自動削除
 *
 * Requirements: 2.5, 2.6, 5.4, 7.2
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheType, CacheKey, CacheEntry, CACHE_KEY_PREFIX } from './types';

/**
 * JSTタイムゾーンオフセット（ミリ秒）
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
 * 翌日の00:00（JST）のタイムスタンプを取得する
 * @param date - 基準日
 * @returns 翌日00:00（JST）のタイムスタンプ
 */
function getNextDayMidnightJST(date: Date): number {
  const jstDate = new Date(date.getTime() + JST_OFFSET);
  const nextDay = new Date(jstDate);
  nextDay.setUTCHours(0, 0, 0, 0);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.getTime() - JST_OFFSET;
}

/**
 * キャッシュマネージャークラス
 *
 * AsyncStorageを使用してニュース・用語データをローカルにキャッシュします。
 * キャッシュは日付ごとに管理され、翌日00:00（JST）に自動的に期限切れとなります。
 */
export class CacheManager {
  /**
   * キャッシュキーを生成する
   * @param type - キャッシュの種類（'news' | 'terms'）
   * @param dateStr - 日付文字列（YYYY-MM-DD形式）
   * @returns キャッシュキー
   */
  static generateCacheKey(type: CacheType, dateStr: string): CacheKey {
    return `${CACHE_KEY_PREFIX}${type}_${dateStr}` as CacheKey;
  }

  /**
   * 今日の日付でキャッシュキーを生成する
   * @param type - キャッシュの種類（'news' | 'terms'）
   * @returns 今日の日付のキャッシュキー
   */
  static generateTodayCacheKey(type: CacheType): CacheKey {
    const today = formatDateToJST(new Date());
    return CacheManager.generateCacheKey(type, today);
  }

  /**
   * データをキャッシュに保存する
   * @param type - キャッシュの種類
   * @param dateStr - 日付文字列（YYYY-MM-DD形式）
   * @param data - 保存するデータ
   */
  async setCache<T>(type: CacheType, dateStr: string, data: T): Promise<void> {
    const key = CacheManager.generateCacheKey(type, dateStr);
    const now = Date.now();
    const expiresAt = getNextDayMidnightJST(new Date());

    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      expiresAt,
    };

    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      // エラーをログに記録するが、例外はスローしない（キャッシュ失敗はアプリ動作に影響しない）
      console.error('Cache write error:', error);
    }
  }

  /**
   * キャッシュからデータを取得する
   * @param type - キャッシュの種類
   * @param dateStr - 日付文字列（YYYY-MM-DD形式）
   * @returns キャッシュされたデータ、存在しないか期限切れの場合はnull
   */
  async getCache<T>(type: CacheType, dateStr: string): Promise<T | null> {
    const key = CacheManager.generateCacheKey(type, dateStr);

    try {
      const value = await AsyncStorage.getItem(key);

      if (!value) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(value);

      // 期限切れチェック
      if (Date.now() > entry.expiresAt) {
        // 期限切れのキャッシュを削除
        await this.removeCache(type, dateStr);
        return null;
      }

      return entry.data;
    } catch (error) {
      // JSONパースエラーなどの場合はnullを返す
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * 今日のキャッシュからデータを取得する
   * @param type - キャッシュの種類
   * @returns 今日のキャッシュデータ、存在しないか期限切れの場合はnull
   */
  async getTodayCache<T>(type: CacheType): Promise<T | null> {
    const today = formatDateToJST(new Date());
    return this.getCache<T>(type, today);
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
   * 指定したキャッシュを削除する
   * @param type - キャッシュの種類
   * @param dateStr - 日付文字列（YYYY-MM-DD形式）
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
   * 期限切れのキャッシュを全て削除する
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            const entry = JSON.parse(value) as CacheEntry<unknown>;
            if (Date.now() > entry.expiresAt) {
              await AsyncStorage.removeItem(key);
            }
          } catch {
            // パースエラーの場合は無視
          }
        }
      }
    } catch (error) {
      console.error('Cache clear expired error:', error);
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
   * キャッシュが有効かどうかを確認する
   * @param type - キャッシュの種類
   * @param dateStr - 日付文字列（YYYY-MM-DD形式）
   * @returns キャッシュが有効な場合はtrue
   */
  async isCacheValid(type: CacheType, dateStr: string): Promise<boolean> {
    const key = CacheManager.generateCacheKey(type, dateStr);

    try {
      const value = await AsyncStorage.getItem(key);

      if (!value) {
        return false;
      }

      const entry = JSON.parse(value) as CacheEntry<unknown>;
      return Date.now() <= entry.expiresAt;
    } catch {
      return false;
    }
  }

  /**
   * 今日のキャッシュが有効かどうかを確認する
   * @param type - キャッシュの種類
   * @returns 今日のキャッシュが有効な場合はtrue
   */
  async isTodayCacheValid(type: CacheType): Promise<boolean> {
    const today = formatDateToJST(new Date());
    return this.isCacheValid(type, today);
  }
}
