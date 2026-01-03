/**
 * Cron設定のテスト
 *
 * Task 13.1: Cron設定とスケジュール定義
 *
 * Vercel Cron Jobsのスケジュール設定に関するユーティリティのテスト
 *
 * Requirements:
 * - 12.4 (Vercel Cron Jobs使用)
 * - 1.1 (毎日8:00に実行)
 * - 3.4 (1日1回の更新)
 */

import {
  CRON_SCHEDULE,
  CRON_ENDPOINTS,
  isValidCronExpression,
  parseCronToJST,
  CronEndpoint,
} from '../cronConfig';

describe('cronConfig', () => {
  describe('CRON_SCHEDULE', () => {
    it('ニュースバッチは毎日23:00 UTCに実行（8:00 JST）', () => {
      expect(CRON_SCHEDULE.NEWS).toBe('0 23 * * *');
    });

    it('用語バッチは毎日23:00 UTCに実行（8:00 JST）', () => {
      // ニュースと同時刻に実行
      expect(CRON_SCHEDULE.TERMS).toBe('0 23 * * *');
    });
  });

  describe('CRON_ENDPOINTS', () => {
    it('ニュースエンドポイントの設定が正しい', () => {
      const newsEndpoint = CRON_ENDPOINTS.find((e) => e.path === '/api/batch/news');
      expect(newsEndpoint).toBeDefined();
      expect(newsEndpoint?.schedule).toBe(CRON_SCHEDULE.NEWS);
    });

    it('用語エンドポイントの設定が正しい', () => {
      const termsEndpoint = CRON_ENDPOINTS.find((e) => e.path === '/api/batch/terms');
      expect(termsEndpoint).toBeDefined();
      expect(termsEndpoint?.schedule).toBe(CRON_SCHEDULE.TERMS);
    });

    it('すべてのエンドポイントが必須フィールドを持つ', () => {
      CRON_ENDPOINTS.forEach((endpoint: CronEndpoint) => {
        expect(endpoint.path).toBeDefined();
        expect(endpoint.schedule).toBeDefined();
        expect(typeof endpoint.path).toBe('string');
        expect(typeof endpoint.schedule).toBe('string');
      });
    });
  });

  describe('isValidCronExpression', () => {
    describe('正常系', () => {
      it('標準的なcron式を検証', () => {
        expect(isValidCronExpression('0 23 * * *')).toBe(true);
        expect(isValidCronExpression('5 23 * * *')).toBe(true);
        expect(isValidCronExpression('*/15 * * * *')).toBe(true);
        expect(isValidCronExpression('0 0 1 * *')).toBe(true);
      });

      it('複雑なcron式を検証', () => {
        expect(isValidCronExpression('0,30 9-17 * * 1-5')).toBe(true);
        expect(isValidCronExpression('0 0 1,15 * *')).toBe(true);
      });
    });

    describe('異常系', () => {
      it('無効なcron式を拒否', () => {
        expect(isValidCronExpression('')).toBe(false);
        expect(isValidCronExpression('invalid')).toBe(false);
        expect(isValidCronExpression('0 0 0 0')).toBe(false); // 4フィールドのみ
        expect(isValidCronExpression('0 0 0 0 0 0')).toBe(false); // 6フィールド
      });

      it('範囲外の値を拒否', () => {
        expect(isValidCronExpression('60 * * * *')).toBe(false); // 分は0-59
        expect(isValidCronExpression('* 24 * * *')).toBe(false); // 時は0-23
        expect(isValidCronExpression('* * 32 * *')).toBe(false); // 日は1-31
        expect(isValidCronExpression('* * * 13 *')).toBe(false); // 月は1-12
        expect(isValidCronExpression('* * * * 8')).toBe(false); // 曜日は0-7
      });
    });
  });

  describe('parseCronToJST', () => {
    it('UTCからJSTへの変換が正しい', () => {
      // 23:00 UTC -> 8:00 JST (+9時間)
      const result = parseCronToJST('0 23 * * *');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(0);
      expect(result.jstString).toBe('08:00 JST');
    });

    it('日をまたぐ変換が正しい', () => {
      // 20:00 UTC -> 5:00 JST (次の日)
      const result = parseCronToJST('0 20 * * *');
      expect(result.hour).toBe(5);
      expect(result.minute).toBe(0);
    });

    it('分の変換が正しい', () => {
      // 23:05 UTC -> 8:05 JST
      const result = parseCronToJST('5 23 * * *');
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(5);
      expect(result.jstString).toBe('08:05 JST');
    });
  });
});
