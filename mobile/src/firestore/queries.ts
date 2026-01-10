/**
 * Firestore クエリ
 * Task 14.2: 日付ベースクエリを実装する
 *
 * 今日の日付でニュース・用語を取得するクエリを提供します。
 * Firestoreリスナーを使用せず、1回の読み取りでデータを取得する設計です。
 *
 * Requirements:
 * - 2.1: アプリ起動時当日ニュース表示
 * - 2.4: 1日中同じニュース表示
 * - 5.1: 用語タブで3つ表示
 * - 5.3: 1日中同じ3用語表示
 *
 * @see https://rnfirebase.io/firestore/usage
 */

import firestore from '@react-native-firebase/firestore';
import {
  NewsData,
  TermsData,
  BatchMetadata,
  FirestoreQueryResult,
  COLLECTIONS,
  METADATA_DOC_ID,
} from './types';
import { toFirestoreError, logFirestoreError } from './errors';

/**
 * JSTタイムゾーンオフセット(ミリ秒)
 * UTC+9
 */
const JST_OFFSET = 9 * 60 * 60 * 1000;

/**
 * 日付をJSTのYYYY-MM-DD形式に変換する
 *
 * @param date - 変換する日付
 * @returns YYYY-MM-DD形式の文字列
 *
 * @example
 * ```typescript
 * const today = formatDateToJST(new Date());
 * console.log(today); // "2024-01-15"
 * ```
 */
export function formatDateToJST(date: Date): string {
  const jstDate = new Date(date.getTime() + JST_OFFSET);
  return jstDate.toISOString().split('T')[0];
}

/**
 * Firestoreのタイムスタンプを日付文字列に変換する
 *
 * @param timestamp - Firestoreのタイムスタンプ
 * @returns ISO 8601形式の文字列
 */
function timestampToString(timestamp: { toDate: () => Date }): string {
  return timestamp.toDate().toISOString();
}

/**
 * 今日のニュースを取得する
 *
 * Firestoreリスナーを使用せず、1回の読み取りでデータを取得します。
 * Requirement 2.4: 1日中同じニュース内容を表示するため、日付をキーに使用。
 *
 * @returns ニュースデータ(見つからない場合はnull)
 * @throws {FirestoreError} 取得失敗時
 *
 * @example
 * ```typescript
 * const result = await fetchTodayNews();
 * if (result.exists && result.data) {
 *   console.log(result.data.worldNews.title);
 * }
 * ```
 */
export async function fetchTodayNews(): Promise<FirestoreQueryResult<NewsData>> {
  const today = formatDateToJST(new Date());

  try {
    const docRef = firestore().collection(COLLECTIONS.NEWS).doc(today);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return { data: null, exists: false };
    }

    const rawData = docSnapshot.data();
    if (!rawData) {
      return { data: null, exists: false };
    }

    // Firestoreのタイムスタンプを文字列に変換
    const newsData: NewsData = {
      date: rawData.date,
      worldNews: {
        title: rawData.worldNews.title,
        summary: rawData.worldNews.summary,
        updatedAt: timestampToString(rawData.worldNews.updatedAt),
      },
      japanNews: {
        title: rawData.japanNews.title,
        summary: rawData.japanNews.summary,
        updatedAt: timestampToString(rawData.japanNews.updatedAt),
      },
      createdAt: timestampToString(rawData.createdAt),
      updatedAt: timestampToString(rawData.updatedAt),
    };

    return { data: newsData, exists: true };
  } catch (error) {
    const firestoreError = toFirestoreError(error);
    logFirestoreError(firestoreError, 'fetchTodayNews');
    throw firestoreError;
  }
}

/**
 * 今日の用語を取得する
 *
 * Firestoreリスナーを使用せず、1回の読み取りでデータを取得します。
 * Requirement 5.3: 1日中同じ3用語を表示するため、日付をキーに使用。
 *
 * @returns 用語データ(見つからない場合はnull)
 * @throws {FirestoreError} 取得失敗時
 *
 * @example
 * ```typescript
 * const result = await fetchTodayTerms();
 * if (result.exists && result.data) {
 *   result.data.terms.forEach(term => console.log(term.name));
 * }
 * ```
 */
export async function fetchTodayTerms(): Promise<FirestoreQueryResult<TermsData>> {
  const today = formatDateToJST(new Date());

  try {
    const docRef = firestore().collection(COLLECTIONS.TERMS).doc(today);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return { data: null, exists: false };
    }

    const rawData = docSnapshot.data();
    if (!rawData) {
      return { data: null, exists: false };
    }

    // Firestoreのタイムスタンプを文字列に変換
    const termsData: TermsData = {
      date: rawData.date,
      terms: rawData.terms.map((term: { name: string; description: string; difficulty: string }) => ({
        name: term.name,
        description: term.description,
        difficulty: term.difficulty,
      })),
      createdAt: timestampToString(rawData.createdAt),
      updatedAt: timestampToString(rawData.updatedAt),
    };

    return { data: termsData, exists: true };
  } catch (error) {
    const firestoreError = toFirestoreError(error);
    logFirestoreError(firestoreError, 'fetchTodayTerms');
    throw firestoreError;
  }
}

/**
 * バッチメタデータを取得する
 *
 * キャッシュ有効性チェック用のメタデータを取得します。
 * オフライン時やエラー時はnullを返します(キャッシュフォールバック用)。
 *
 * @returns バッチメタデータ(取得失敗時はnull)
 *
 * @example
 * ```typescript
 * const metadata = await fetchBatchMetadata();
 * if (metadata) {
 *   console.log(metadata.newsLastUpdated);
 * }
 * ```
 */
export async function fetchBatchMetadata(): Promise<BatchMetadata | null> {
  try {
    const docRef = firestore()
      .collection(COLLECTIONS.METADATA)
      .doc(METADATA_DOC_ID.BATCH);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return null;
    }

    const rawData = docSnapshot.data();
    if (!rawData) {
      return null;
    }

    // Firestoreのタイムスタンプをミリ秒に変換
    const metadata: BatchMetadata = {
      newsLastUpdated: rawData.newsLastUpdated.toMillis(),
      termsLastUpdated: rawData.termsLastUpdated.toMillis(),
    };

    return metadata;
  } catch (error) {
    // メタデータ取得失敗時はログを出力してnullを返す
    // これによりオフライン時にキャッシュを使用できる
    console.warn('[Firestore] Failed to fetch batch metadata:', error);
    return null;
  }
}

/**
 * 特定の日付のニュースを取得する
 *
 * @param dateStr - 日付(YYYY-MM-DD形式)
 * @returns ニュースデータ
 * @throws {FirestoreError} 取得失敗時
 */
export async function fetchNewsByDate(
  dateStr: string
): Promise<FirestoreQueryResult<NewsData>> {
  try {
    const docRef = firestore().collection(COLLECTIONS.NEWS).doc(dateStr);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return { data: null, exists: false };
    }

    const rawData = docSnapshot.data();
    if (!rawData) {
      return { data: null, exists: false };
    }

    const newsData: NewsData = {
      date: rawData.date,
      worldNews: {
        title: rawData.worldNews.title,
        summary: rawData.worldNews.summary,
        updatedAt: timestampToString(rawData.worldNews.updatedAt),
      },
      japanNews: {
        title: rawData.japanNews.title,
        summary: rawData.japanNews.summary,
        updatedAt: timestampToString(rawData.japanNews.updatedAt),
      },
      createdAt: timestampToString(rawData.createdAt),
      updatedAt: timestampToString(rawData.updatedAt),
    };

    return { data: newsData, exists: true };
  } catch (error) {
    const firestoreError = toFirestoreError(error);
    logFirestoreError(firestoreError, 'fetchNewsByDate');
    throw firestoreError;
  }
}

/**
 * 特定の日付の用語を取得する
 *
 * @param dateStr - 日付(YYYY-MM-DD形式)
 * @returns 用語データ
 * @throws {FirestoreError} 取得失敗時
 */
export async function fetchTermsByDate(
  dateStr: string
): Promise<FirestoreQueryResult<TermsData>> {
  try {
    const docRef = firestore().collection(COLLECTIONS.TERMS).doc(dateStr);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return { data: null, exists: false };
    }

    const rawData = docSnapshot.data();
    if (!rawData) {
      return { data: null, exists: false };
    }

    const termsData: TermsData = {
      date: rawData.date,
      terms: rawData.terms.map((term: { name: string; description: string; difficulty: string }) => ({
        name: term.name,
        description: term.description,
        difficulty: term.difficulty,
      })),
      createdAt: timestampToString(rawData.createdAt),
      updatedAt: timestampToString(rawData.updatedAt),
    };

    return { data: termsData, exists: true };
  } catch (error) {
    const firestoreError = toFirestoreError(error);
    logFirestoreError(firestoreError, 'fetchTermsByDate');
    throw firestoreError;
  }
}
