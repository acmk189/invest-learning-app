/**
 * 配信済み用語リポジトリ
 * Task 10.1: 配信済み用語取得機能
 *
 * Firestore terms_historyコレクションから過去30日分の
 * 配信済み用語を取得する機能を提供します。
 *
 * Requirements: 4.3 (過去30日以内に配信した用語を除外)
 *
 * Firestoreパス: terms_history/{auto-generated-id}
 * @see https://firebase.google.com/docs/firestore/query-data/queries - Firestoreクエリ
 */

import { Firestore } from 'firebase-admin/firestore';
import { TermDifficulty, TermHistoryDocument } from '../../../models/terms.model';

/**
 * 配信済み用語エントリ
 *
 * Firestoreから取得した用語履歴データを表現します。
 * ドキュメントIDを含めた型定義です。
 */
export interface TermHistoryEntry {
  /** ドキュメントID */
  id: string;
  /** 用語名 */
  termName: string;
  /** 配信日時 */
  deliveredAt: Date;
  /** 難易度 */
  difficulty: TermDifficulty;
}

/**
 * 配信済み用語クエリオプション
 *
 * 取得条件を柔軟に指定するためのクエリ型です。
 */
export interface TermHistoryQuery {
  /**
   * 何日前までの用語を取得するか
   * @default 30
   */
  days: number;

  /**
   * 難易度でフィルタリング（オプション）
   */
  difficulty?: TermDifficulty;

  /**
   * 取得件数の上限（オプション）
   */
  limit?: number;
}

/**
 * 配信済み用語リポジトリ
 *
 * Firestore terms_historyコレクションから配信済み用語を取得します。
 * 過去30日以内の用語を除外するための重複チェックに使用されます。
 *
 * @example
 * const firestore = getFirestore();
 * const repo = new TermHistoryRepository(firestore);
 *
 * // 過去30日分の用語を取得
 * const terms = await repo.getDeliveredTerms(30);
 *
 * // 用語名のみを取得
 * const termNames = await repo.getDeliveredTermNames(30);
 */
export class TermHistoryRepository {
  /**
   * Firestoreインスタンス
   */
  private readonly firestore: Firestore;

  /**
   * コレクション名
   */
  private readonly collectionName = 'terms_history';

  /**
   * コンストラクタ
   *
   * @param firestore - Firestoreインスタンス
   */
  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  /**
   * 過去N日分の配信済み用語を取得
   *
   * 指定された日数以内に配信された用語の一覧を取得します。
   * デフォルトでは過去30日分の用語を取得します。
   *
   * @param days - 何日前までの用語を取得するか（デフォルト: 30）
   * @returns 配信済み用語のエントリリスト
   */
  async getDeliveredTerms(days: number = 30): Promise<TermHistoryEntry[]> {
    // N日前の日付を計算
    const cutoffDate = this.calculateCutoffDate(days);

    // Firestoreからデータを取得
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('deliveredAt', '>=', cutoffDate)
      .get();

    // ドキュメントをエントリに変換
    return snapshot.docs.map((doc) => this.docToEntry(doc));
  }

  /**
   * 過去N日分の配信済み用語名を取得
   *
   * 用語名のみを取得するヘルパーメソッドです。
   * 重複チェック時の比較に使用します。
   *
   * @param days - 何日前までの用語を取得するか（デフォルト: 30）
   * @returns 用語名の配列
   */
  async getDeliveredTermNames(days: number = 30): Promise<string[]> {
    const entries = await this.getDeliveredTerms(days);
    return entries.map((entry) => entry.termName);
  }

  /**
   * クエリオプションを使用して配信済み用語を取得
   *
   * より柔軟な条件で用語を取得します。
   * 難易度フィルタリングや件数制限が可能です。
   *
   * @param query - クエリオプション
   * @returns 配信済み用語のエントリリスト
   */
  async getDeliveredTermsWithQuery(
    query: TermHistoryQuery
  ): Promise<TermHistoryEntry[]> {
    // N日前の日付を計算
    const cutoffDate = this.calculateCutoffDate(query.days);

    // クエリを構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let firestoreQuery: any = this.firestore
      .collection(this.collectionName)
      .where('deliveredAt', '>=', cutoffDate);

    // 難易度フィルタリング
    if (query.difficulty) {
      firestoreQuery = firestoreQuery.where('difficulty', '==', query.difficulty);
    }

    // 件数制限
    if (query.limit) {
      firestoreQuery = firestoreQuery.limit(query.limit);
    }

    const snapshot = await firestoreQuery.get();

    // ドキュメントをエントリに変換
    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) =>
      this.docToEntry(doc)
    );
  }

  /**
   * N日前の日付を計算
   *
   * @param days - 何日前か
   * @returns N日前の日付
   */
  private calculateCutoffDate(days: number): Date {
    const now = new Date();
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * Firestoreドキュメントをエントリに変換
   *
   * @param doc - Firestoreドキュメント
   * @returns 配信済み用語エントリ
   */
  private docToEntry(
    doc: FirebaseFirestore.QueryDocumentSnapshot
  ): TermHistoryEntry {
    const data = doc.data() as TermHistoryDocument;

    // Firestoreのタイムスタンプを Date に変換
    // Firestore Timestamp の場合は toDate() で変換
    const deliveredAt =
      data.deliveredAt instanceof Date
        ? data.deliveredAt
        : (data.deliveredAt as unknown as FirebaseFirestore.Timestamp).toDate?.() ||
          data.deliveredAt;

    return {
      id: doc.id,
      termName: data.termName,
      deliveredAt,
      difficulty: data.difficulty,
    };
  }
}
