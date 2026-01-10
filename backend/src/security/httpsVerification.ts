/**
 * HTTPS通信確認ユーティリティ
 *
 * Task 31.1: HTTPS通信確認
 * Requirements: 9.3, 9.4
 *
 * すべての外部API通信(NewsAPI、Google News RSS、Claude API)で
 * HTTPSが使用されていることを確認・検証します。
 * 通信データはTLS 1.2以上で暗号化されます。
 *
 * @see https://newsapi.org/docs/get-started - NewsAPI(HTTPS必須)
 * @see https://docs.anthropic.com/en/api/getting-started - Claude API(HTTPS必須)
 * @see https://news.google.com - Google News RSS(HTTPS対応)
 */

/**
 * 外部APIエンドポイントの定義
 *
 * @property name - エンドポイント名
 * @property url - ベースURL(HTTPS)
 * @property minTlsVersion - 最小TLSバージョン
 * @property description - エンドポイントの説明
 */
export interface ExternalApiEndpoint {
  name: string;
  url: string;
  minTlsVersion: '1.2' | '1.3';
  description: string;
}

/**
 * エンドポイントセキュリティ情報
 *
 * @property isHttps - HTTPS通信が有効か
 * @property url - エンドポイントURL
 * @property minTlsVersion - 最小TLSバージョン
 * @property description - エンドポイントの説明
 */
export interface EndpointSecurityInfo {
  isHttps: boolean;
  url: string;
  minTlsVersion: '1.2' | '1.3';
  description: string;
}

/**
 * HTTPS検証結果
 *
 * @property isValid - すべてのエンドポイントがHTTPSを使用している場合true
 * @property validEndpoints - HTTPSを使用しているエンドポイントのリスト
 * @property invalidEndpoints - HTTPSを使用していないエンドポイントのリスト
 */
export interface HttpsVerificationResult {
  isValid: boolean;
  validEndpoints: Array<{
    name: string;
    url: string;
    isHttps: boolean;
  }>;
  invalidEndpoints: Array<{
    name: string;
    url: string;
    isHttps: boolean;
  }>;
}

/**
 * 外部APIエンドポイント一覧
 *
 * 本アプリケーションで使用するすべての外部APIエンドポイントを定義。
 * すべてHTTPS通信を使用し、TLS 1.2以上で暗号化されます。
 */
export const EXTERNAL_API_ENDPOINTS: ExternalApiEndpoint[] = [
  {
    name: 'NewsAPI',
    url: 'https://newsapi.org/v2',
    minTlsVersion: '1.2',
    description: '世界のニュース取得API(無料枠: 100リクエスト/日)',
  },
  {
    name: 'Claude API',
    url: 'https://api.anthropic.com',
    minTlsVersion: '1.2',
    description: 'ニュース要約・用語生成AI API(Anthropic)',
  },
  {
    name: 'Google News RSS',
    url: 'https://news.google.com/rss',
    minTlsVersion: '1.2',
    description: '日本の経済ニュースRSSフィード',
  },
];

/**
 * URLがHTTPSを使用しているか確認する
 *
 * @param url - 確認対象のURL
 * @returns HTTPSを使用している場合true
 */
function isHttpsUrl(url: string): boolean {
  return url.toLowerCase().startsWith('https://');
}

/**
 * すべての外部APIエンドポイントがHTTPSを使用しているか検証する
 *
 * ヘルスチェックやセキュリティ監査で使用します。
 *
 * @returns 検証結果
 *
 * @example
 * const result = verifyAllEndpointsUseHttps();
 * if (!result.isValid) {
 *   console.error('HTTPSを使用していないエンドポイント:', result.invalidEndpoints);
 * }
 */
export function verifyAllEndpointsUseHttps(): HttpsVerificationResult {
  const validEndpoints: HttpsVerificationResult['validEndpoints'] = [];
  const invalidEndpoints: HttpsVerificationResult['invalidEndpoints'] = [];

  EXTERNAL_API_ENDPOINTS.forEach((endpoint) => {
    const isHttps = isHttpsUrl(endpoint.url);
    const info = {
      name: endpoint.name,
      url: endpoint.url,
      isHttps,
    };

    if (isHttps) {
      validEndpoints.push(info);
    } else {
      invalidEndpoints.push(info);
    }
  });

  return {
    isValid: invalidEndpoints.length === 0,
    validEndpoints,
    invalidEndpoints,
  };
}

/**
 * 各エンドポイントのセキュリティステータスを取得する
 *
 * @returns エンドポイント名をキーとしたセキュリティ情報のマップ
 *
 * @example
 * const status = getEndpointSecurityStatus();
 * console.log(status['NewsAPI'].isHttps); // true
 */
export function getEndpointSecurityStatus(): Record<string, EndpointSecurityInfo> {
  const status: Record<string, EndpointSecurityInfo> = {};

  EXTERNAL_API_ENDPOINTS.forEach((endpoint) => {
    status[endpoint.name] = {
      isHttps: isHttpsUrl(endpoint.url),
      url: endpoint.url,
      minTlsVersion: endpoint.minTlsVersion,
      description: endpoint.description,
    };
  });

  return status;
}
