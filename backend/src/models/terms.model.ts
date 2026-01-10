/**
 * Terms Data Model
 *
 * Requirements Coverage:
 * - Requirement 3.3: Firestore 1MB以下ドキュメント
 * - Requirement 4.1: 1日3つ投資用語生成
 * - Requirement 4.2: 各用語に500文字解説生成
 * - Requirement 4.5: 用語データFirestore保存
 * - Requirement 4.6: 全履歴保持(重複チェック用)
 *
 * Firestoreスキーマ:
 * - Collection: terms
 *   - Document ID: YYYY-MM-DD形式の日付
 *   - Fields: terms (配列、3つの用語)
 * - Collection: terms_history
 *   - Document ID: 自動生成
 *   - Fields: termName, deliveredAt, difficulty
 */

/**
 * 用語の難易度
 */
export type TermDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * 投資・金融用語
 */
export interface Term {
  /** 用語名 */
  name: string;
  /** 解説文(約500文字) */
  description: string;
  /** 難易度 */
  difficulty: TermDifficulty;
}

/**
 * 用語ドキュメント
 *
 * Firestoreパス: terms/{date}
 */
export interface TermsDocument {
  /** 日付(ドキュメントID): YYYY-MM-DD形式 */
  date: string;
  /** 3つの用語 */
  terms: Term[];
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * 用語配信履歴ドキュメント
 *
 * Firestoreパス: terms_history/{auto-generated-id}
 *
 * 用途: 過去30日以内の重複チェック用(Requirement 4.3)
 */
export interface TermHistoryDocument {
  /** 用語名 */
  termName: string;
  /** 配信日時 */
  deliveredAt: Date;
  /** 難易度 */
  difficulty: TermDifficulty;
}

/**
 * 用語ドキュメントを検証する
 *
 * @param termsDoc 検証対象の用語ドキュメント
 * @throws {Error} 検証失敗時
 *
 * 検証項目:
 * - 日付がYYYY-MM-DD形式であること
 * - 用語が必ず3つであること(Requirement 4.1)
 * - 各用語の解説文が400〜600文字の範囲内であること(Requirement 4.2)
 */
export function validateTermsDocument(termsDoc: TermsDocument): void {
  // 日付フォーマット検証
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(termsDoc.date)) {
    throw new Error('日付はYYYY-MM-DD形式である必要があります');
  }

  // 用語数検証
  if (termsDoc.terms.length !== 3) {
    throw new Error(
      `用語は必ず3つである必要があります(現在: ${termsDoc.terms.length}個)`
    );
  }

  // 各用語を検証
  termsDoc.terms.forEach((term, index) => {
    try {
      validateTerm(term);
    } catch (error) {
      throw new Error(
        `用語${index + 1}の検証に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}

/**
 * 用語を検証する
 *
 * @param term 検証対象の用語
 * @throws {Error} 検証失敗時
 *
 * 検証項目:
 * - 用語名が空でないこと
 * - 解説文が400〜600文字の範囲内であること
 * - 難易度が有効な値であること
 */
export function validateTerm(term: Term): void {
  // 用語名検証
  if (!term.name || term.name.trim() === '') {
    throw new Error('用語名は必須です');
  }

  // 解説文の文字数検証
  const descriptionLength = term.description.length;
  if (descriptionLength < 400 || descriptionLength > 600) {
    throw new Error(
      `解説文は400〜600文字である必要があります(現在: ${descriptionLength}文字)`
    );
  }

  // 難易度検証
  const validDifficulties: TermDifficulty[] = ['beginner', 'intermediate', 'advanced'];
  if (!validDifficulties.includes(term.difficulty)) {
    throw new Error(
      `難易度はbeginner, intermediate, advancedのいずれかである必要があります(現在: ${term.difficulty})`
    );
  }
}

/**
 * Firestore用の用語ドキュメントを作成する
 *
 * @param date 日付(YYYY-MM-DD形式)
 * @param terms 3つの用語
 * @returns 用語ドキュメント
 */
export function createTermsDocument(date: string, terms: Term[]): TermsDocument {
  const now = new Date();
  return {
    date,
    terms,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Firestore用の用語配信履歴ドキュメントを作成する
 *
 * @param termName 用語名
 * @param difficulty 難易度
 * @returns 用語配信履歴ドキュメント
 */
export function createTermHistoryDocument(
  termName: string,
  difficulty: TermDifficulty
): TermHistoryDocument {
  return {
    termName,
    deliveredAt: new Date(),
    difficulty,
  };
}
