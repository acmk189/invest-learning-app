/**
 * 重複判定ロジックテスト
 * Task 10.2: 重複判定ロジック
 *
 * 新規生成された用語が配信済み用語リストに含まれるかを
 * チェックする機能をテストします。
 *
 * Requirements: 4.3, 5.5 (過去30日重複除外、重複なし保証表示)
 */

import {
  DuplicateChecker,
  DuplicateCheckResult,
  DuplicateCheckMode,
  normalizeTermName,
} from '../duplicateChecker';

describe('DuplicateChecker', () => {
  describe('normalizeTermName', () => {
    it('用語名を正規化できる（小文字変換）', () => {
      expect(normalizeTermName('PER')).toBe('per');
      expect(normalizeTermName('ROE')).toBe('roe');
    });

    it('全角を半角に変換できる', () => {
      expect(normalizeTermName('ＰＥＲ')).toBe('per');
      expect(normalizeTermName('ＲＯＥ')).toBe('roe');
    });

    it('前後の空白を削除できる', () => {
      expect(normalizeTermName('  PER  ')).toBe('per');
      expect(normalizeTermName('\t株価収益率\t')).toBe('株価収益率');
    });

    it('中間の空白は保持する', () => {
      expect(normalizeTermName('配当 利回り')).toBe('配当 利回り');
    });
  });

  describe('完全一致チェック', () => {
    let checker: DuplicateChecker;

    beforeEach(() => {
      const deliveredTerms = ['PER', 'PBR', 'ROE', '株価収益率', '配当利回り'];
      checker = new DuplicateChecker(deliveredTerms);
    });

    it('重複している場合はtrueを返す', () => {
      const result = checker.check('PER');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTerm).toBe('PER');
      expect(result.matchType).toBe('exact');
    });

    it('重複していない場合はfalseを返す', () => {
      const result = checker.check('EPS');
      expect(result.isDuplicate).toBe(false);
      expect(result.matchedTerm).toBeUndefined();
    });

    it('大文字小文字を区別しない', () => {
      const result = checker.check('per');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTerm).toBe('PER');
    });

    it('日本語用語も正しく判定できる', () => {
      const result = checker.check('株価収益率');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTerm).toBe('株価収益率');
    });

    it('全角半角を区別しない', () => {
      const result = checker.check('ＰＥＲ');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTerm).toBe('PER');
    });
  });

  describe('部分一致チェック', () => {
    let checker: DuplicateChecker;

    beforeEach(() => {
      const deliveredTerms = ['株価収益率', '配当利回り', 'ROE'];
      checker = new DuplicateChecker(deliveredTerms, {
        mode: DuplicateCheckMode.PARTIAL,
      });
    });

    it('部分一致する場合はtrueを返す', () => {
      const result = checker.check('株価収益率（PER）');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTerm).toBe('株価収益率');
      expect(result.matchType).toBe('partial');
    });

    it('配信済み用語が新用語に含まれる場合もtrueを返す', () => {
      const result = checker.check('ROEとは');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTerm).toBe('ROE');
    });

    it('新用語が配信済み用語に含まれる場合もtrueを返す', () => {
      // 「配当」は「配当利回り」に含まれる
      const result = checker.check('配当');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedTerm).toBe('配当利回り');
    });

    it('部分一致しない場合はfalseを返す', () => {
      const result = checker.check('時価総額');
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('複数の用語を一括チェック', () => {
    let checker: DuplicateChecker;

    beforeEach(() => {
      const deliveredTerms = ['PER', 'PBR', 'ROE'];
      checker = new DuplicateChecker(deliveredTerms);
    });

    it('複数の用語を一括でチェックできる', () => {
      const results = checker.checkMultiple(['PER', 'EPS', 'PBR', 'BPS']);

      expect(results).toHaveLength(4);
      expect(results[0].isDuplicate).toBe(true); // PER
      expect(results[1].isDuplicate).toBe(false); // EPS
      expect(results[2].isDuplicate).toBe(true); // PBR
      expect(results[3].isDuplicate).toBe(false); // BPS
    });

    it('重複している用語のみを抽出できる', () => {
      const duplicates = checker.findDuplicates(['PER', 'EPS', 'PBR', 'BPS']);
      expect(duplicates).toEqual(['PER', 'PBR']);
    });

    it('重複していない用語のみを抽出できる', () => {
      const nonDuplicates = checker.findNonDuplicates(['PER', 'EPS', 'PBR', 'BPS']);
      expect(nonDuplicates).toEqual(['EPS', 'BPS']);
    });
  });

  describe('配信済み用語リストの管理', () => {
    it('配信済み用語リストを取得できる', () => {
      const deliveredTerms = ['PER', 'PBR', 'ROE'];
      const checker = new DuplicateChecker(deliveredTerms);

      expect(checker.getDeliveredTerms()).toEqual(['PER', 'PBR', 'ROE']);
    });

    it('配信済み用語を追加できる', () => {
      const checker = new DuplicateChecker(['PER']);
      checker.addDeliveredTerm('PBR');

      expect(checker.getDeliveredTerms()).toContain('PBR');
      expect(checker.check('PBR').isDuplicate).toBe(true);
    });

    it('配信済み用語リストが空の場合は常にfalseを返す', () => {
      const checker = new DuplicateChecker([]);
      const result = checker.check('PER');

      expect(result.isDuplicate).toBe(false);
    });

    it('配信済み用語の件数を取得できる', () => {
      const checker = new DuplicateChecker(['PER', 'PBR', 'ROE']);
      expect(checker.getDeliveredTermCount()).toBe(3);
    });
  });

  describe('チェック統計', () => {
    it('チェック回数と重複検出回数を取得できる', () => {
      const checker = new DuplicateChecker(['PER', 'PBR']);

      checker.check('PER'); // 重複
      checker.check('EPS'); // 非重複
      checker.check('PBR'); // 重複

      const stats = checker.getStats();
      expect(stats.totalChecks).toBe(3);
      expect(stats.duplicatesFound).toBe(2);
    });

    it('統計をリセットできる', () => {
      const checker = new DuplicateChecker(['PER']);
      checker.check('PER');
      checker.check('EPS');

      checker.resetStats();
      const stats = checker.getStats();
      expect(stats.totalChecks).toBe(0);
      expect(stats.duplicatesFound).toBe(0);
    });
  });

  describe('類似度チェック（オプション）', () => {
    let checker: DuplicateChecker;

    beforeEach(() => {
      const deliveredTerms = ['株価収益率', 'PER'];
      checker = new DuplicateChecker(deliveredTerms, {
        mode: DuplicateCheckMode.SIMILARITY,
        similarityThreshold: 0.7,
      });
    });

    it('類似度が閾値以上の場合はtrueを返す', () => {
      // 「株価収益比率」は「株価収益率」と類似
      const result = checker.check('株価収益比率');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('similarity');
      expect(result.similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('類似度が閾値未満の場合はfalseを返す', () => {
      const result = checker.check('時価総額');
      expect(result.isDuplicate).toBe(false);
    });
  });
});

describe('DuplicateCheckResult', () => {
  it('正しい構造を持つ', () => {
    const result: DuplicateCheckResult = {
      termName: 'PER',
      isDuplicate: true,
      matchedTerm: 'PER',
      matchType: 'exact',
    };

    expect(result.termName).toBe('PER');
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedTerm).toBe('PER');
    expect(result.matchType).toBe('exact');
  });

  it('類似度を含む結果を持てる', () => {
    const result: DuplicateCheckResult = {
      termName: '株価収益比率',
      isDuplicate: true,
      matchedTerm: '株価収益率',
      matchType: 'similarity',
      similarity: 0.85,
    };

    expect(result.similarity).toBe(0.85);
  });
});
