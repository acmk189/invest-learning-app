/**
 * News Data Model
 *
 * Requirements Coverage:
 * - Requirement 3.3: Firestore 1MB以下ドキュメント
 * - Requirement 1.6: 処理完了後Firestoreに保存
 * - Requirement 1.4: 複数記事を2000文字に要約
 *
 * Firestoreスキーマ:
 * - Collection: news
 * - Document ID: YYYY-MM-DD形式の日付
 * - Fields: worldNews, japanNews, createdAt, updatedAt
 */

/**
 * 世界のニュース要約
 */
export interface WorldNews {
  /** ニュースタイトル */
  title: string;
  /** 要約本文(約2000文字) */
  summary: string;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * 日本のニュース要約
 */
export interface JapanNews {
  /** ニュースタイトル */
  title: string;
  /** 要約本文(約2000文字) */
  summary: string;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * ニュースドキュメント
 *
 * Firestoreパス: news/{date}
 */
export interface NewsDocument {
  /** 日付(ドキュメントID): YYYY-MM-DD形式 */
  date: string;
  /** 世界のニュース要約 */
  worldNews: WorldNews;
  /** 日本のニュース要約 */
  japanNews: JapanNews;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * ニュースドキュメントを検証する
 *
 * @param newsDoc 検証対象のニュースドキュメント
 * @throws {Error} 検証失敗時
 *
 * 検証項目:
 * - 日付がYYYY-MM-DD形式であること
 * - 要約文が1800〜2200文字の範囲内であること(Requirement 1.4)
 * - ドキュメントサイズが1MB以下であること(Requirement 3.3)
 */
export function validateNewsDocument(newsDoc: NewsDocument): void {
  // 日付フォーマット検証
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(newsDoc.date)) {
    throw new Error('日付はYYYY-MM-DD形式である必要があります');
  }

  // 世界ニュース要約文の文字数検証
  const worldSummaryLength = newsDoc.worldNews.summary.length;
  if (worldSummaryLength < 1800 || worldSummaryLength > 2200) {
    throw new Error(
      `世界ニュースの要約文は1800〜2200文字である必要があります(現在: ${worldSummaryLength}文字)`
    );
  }

  // 日本ニュース要約文の文字数検証
  const japanSummaryLength = newsDoc.japanNews.summary.length;
  if (japanSummaryLength < 1800 || japanSummaryLength > 2200) {
    throw new Error(
      `日本ニュースの要約文は1800〜2200文字である必要があります(現在: ${japanSummaryLength}文字)`
    );
  }

  // ドキュメントサイズ検証(1MB = 1,048,576 bytes)
  const docSize = estimateDocumentSize(newsDoc);
  const maxSize = 1048576; // 1MB
  if (docSize > maxSize) {
    throw new Error(
      `ドキュメントサイズが1MBを超えています(現在: ${Math.round(docSize / 1024)}KB)`
    );
  }
}

/**
 * ドキュメントのサイズを推定する
 *
 * @param doc ドキュメント
 * @returns 推定サイズ(bytes)
 */
function estimateDocumentSize(doc: NewsDocument): number {
  // JSON文字列化してバイト数を計算(UTF-8エンコーディング)
  const jsonString = JSON.stringify(doc);
  return Buffer.byteLength(jsonString, 'utf8');
}

/**
 * Firestore用のニュースドキュメントを作成する
 *
 * @param date 日付(YYYY-MM-DD形式)
 * @param worldNews 世界のニュース要約
 * @param japanNews 日本のニュース要約
 * @returns ニュースドキュメント
 */
export function createNewsDocument(
  date: string,
  worldNews: Omit<WorldNews, 'updatedAt'>,
  japanNews: Omit<JapanNews, 'updatedAt'>
): NewsDocument {
  const now = new Date();
  return {
    date,
    worldNews: {
      ...worldNews,
      updatedAt: now,
    },
    japanNews: {
      ...japanNews,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}
