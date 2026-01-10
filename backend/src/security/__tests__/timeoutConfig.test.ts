/**
 * 通信タイムアウト設定テスト
 *
 * Task 31.2: 通信タイムアウト設定
 * Requirements: 9.3
 *
 * API通信のタイムアウト設定を検証します。
 */

import {
  getTimeoutConfig,
  validateTimeoutConfig,
  TIMEOUT_CONFIG,
} from '../timeoutConfig';

describe('timeoutConfig', () => {
  describe('TIMEOUT_CONFIG', () => {
    it('NewsAPIのタイムアウト設定が定義されている', () => {
      expect(TIMEOUT_CONFIG.newsApi).toBeDefined();
      expect(TIMEOUT_CONFIG.newsApi.timeoutMs).toBeGreaterThan(0);
      expect(TIMEOUT_CONFIG.newsApi.timeoutMs).toBeLessThanOrEqual(30000);
    });

    it('Claude APIのタイムアウト設定が定義されている', () => {
      expect(TIMEOUT_CONFIG.claudeApi).toBeDefined();
      expect(TIMEOUT_CONFIG.claudeApi.timeoutMs).toBeGreaterThan(0);
      expect(TIMEOUT_CONFIG.claudeApi.timeoutMs).toBeLessThanOrEqual(120000);
    });

    it('Google News RSSのタイムアウト設定が定義されている', () => {
      expect(TIMEOUT_CONFIG.googleNewsRss).toBeDefined();
      expect(TIMEOUT_CONFIG.googleNewsRss.timeoutMs).toBeGreaterThan(0);
      expect(TIMEOUT_CONFIG.googleNewsRss.timeoutMs).toBeLessThanOrEqual(30000);
    });

    it('バッチ処理のタイムアウト設定が定義されている', () => {
      expect(TIMEOUT_CONFIG.batchProcess).toBeDefined();
      expect(TIMEOUT_CONFIG.batchProcess.timeoutMs).toBeGreaterThan(0);
      // バッチ処理は5分以内に完了する必要がある(Requirements: 1.8)
      expect(TIMEOUT_CONFIG.batchProcess.timeoutMs).toBeLessThanOrEqual(300000);
    });

    it('各設定に説明が含まれている', () => {
      Object.values(TIMEOUT_CONFIG).forEach((config) => {
        expect(config.description).toBeDefined();
        expect(config.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getTimeoutConfig', () => {
    it('指定したサービスのタイムアウト設定を返す', () => {
      const newsApiConfig = getTimeoutConfig('newsApi');
      expect(newsApiConfig).toEqual(TIMEOUT_CONFIG.newsApi);

      const claudeApiConfig = getTimeoutConfig('claudeApi');
      expect(claudeApiConfig).toEqual(TIMEOUT_CONFIG.claudeApi);
    });

    it('存在しないサービス名の場合はundefinedを返す', () => {
      // @ts-expect-error - 意図的に無効なサービス名をテスト
      const unknownConfig = getTimeoutConfig('unknownService');
      expect(unknownConfig).toBeUndefined();
    });
  });

  describe('validateTimeoutConfig', () => {
    it('すべてのタイムアウト設定が有効な場合、isValidがtrueになる', () => {
      const result = validateTimeoutConfig();

      expect(result.isValid).toBe(true);
      expect(result.invalidConfigs).toHaveLength(0);
    });

    it('検証結果にすべての設定情報が含まれている', () => {
      const result = validateTimeoutConfig();

      expect(result.configs).toBeDefined();
      expect(Object.keys(result.configs).length).toBe(
        Object.keys(TIMEOUT_CONFIG).length
      );
    });

    it('各設定が適切な範囲内であることを確認できる', () => {
      const result = validateTimeoutConfig();

      Object.values(result.configs).forEach((config) => {
        expect(config.isValid).toBe(true);
        expect(config.timeoutMs).toBeGreaterThan(0);
      });
    });
  });
});
