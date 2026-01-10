/**
 * HTTPS通信確認テスト
 *
 * Task 31.1: HTTPS通信確認
 * Requirements: 9.3, 9.4
 *
 * すべての外部API通信でHTTPSが使用されていることを検証します。
 */

import {
  verifyAllEndpointsUseHttps,
  getEndpointSecurityStatus,
  type EndpointSecurityInfo,
  EXTERNAL_API_ENDPOINTS,
} from '../httpsVerification';

describe('httpsVerification', () => {
  describe('EXTERNAL_API_ENDPOINTS', () => {
    it('すべてのエンドポイントがHTTPSを使用している', () => {
      EXTERNAL_API_ENDPOINTS.forEach((endpoint) => {
        expect(endpoint.url.startsWith('https://')).toBe(true);
      });
    });

    it('NewsAPI、Claude API、Google News RSSのエンドポイントが含まれている', () => {
      const names = EXTERNAL_API_ENDPOINTS.map((e) => e.name);
      expect(names).toContain('NewsAPI');
      expect(names).toContain('Claude API');
      expect(names).toContain('Google News RSS');
    });

    it('各エンドポイントにTLSバージョン情報が含まれている', () => {
      EXTERNAL_API_ENDPOINTS.forEach((endpoint) => {
        expect(endpoint.minTlsVersion).toBeDefined();
        expect(['1.2', '1.3']).toContain(endpoint.minTlsVersion);
      });
    });
  });

  describe('verifyAllEndpointsUseHttps', () => {
    it('すべてのエンドポイントがHTTPSを使用している場合、isValidがtrueになる', () => {
      const result = verifyAllEndpointsUseHttps();

      expect(result.isValid).toBe(true);
      expect(result.invalidEndpoints).toHaveLength(0);
      expect(result.validEndpoints.length).toBe(EXTERNAL_API_ENDPOINTS.length);
    });

    it('検証結果にすべてのエンドポイント情報が含まれている', () => {
      const result = verifyAllEndpointsUseHttps();

      expect(result.validEndpoints.length).toBeGreaterThan(0);
      result.validEndpoints.forEach((endpoint) => {
        expect(endpoint.name).toBeDefined();
        expect(endpoint.url).toBeDefined();
        expect(endpoint.isHttps).toBe(true);
      });
    });
  });

  describe('getEndpointSecurityStatus', () => {
    it('各エンドポイントのセキュリティステータスを返す', () => {
      const status = getEndpointSecurityStatus();

      expect(Object.keys(status).length).toBe(EXTERNAL_API_ENDPOINTS.length);

      Object.values(status).forEach((info: EndpointSecurityInfo) => {
        expect(info.isHttps).toBe(true);
        expect(info.url).toBeDefined();
        expect(info.minTlsVersion).toBeDefined();
        expect(info.description).toBeDefined();
      });
    });

    it('NewsAPIのステータスを正しく返す', () => {
      const status = getEndpointSecurityStatus();

      expect(status['NewsAPI']).toBeDefined();
      expect(status['NewsAPI'].isHttps).toBe(true);
      expect(status['NewsAPI'].url).toContain('newsapi.org');
    });

    it('Claude APIのステータスを正しく返す', () => {
      const status = getEndpointSecurityStatus();

      expect(status['Claude API']).toBeDefined();
      expect(status['Claude API'].isHttps).toBe(true);
      expect(status['Claude API'].url).toContain('anthropic.com');
    });

    it('Google News RSSのステータスを正しく返す', () => {
      const status = getEndpointSecurityStatus();

      expect(status['Google News RSS']).toBeDefined();
      expect(status['Google News RSS'].isHttps).toBe(true);
      expect(status['Google News RSS'].url).toContain('news.google.com');
    });
  });
});
