/**
 * セキュリティモジュールのエクスポート
 *
 * Task 31: セキュリティ - 通信
 * Requirements: 9.3, 9.4, 9.5, 12.7
 *
 * HTTPS通信確認、タイムアウト設定、プライバシー・利用規約確認を統合的にエクスポートします。
 */

// HTTPS通信確認
export {
  verifyAllEndpointsUseHttps,
  getEndpointSecurityStatus,
  EXTERNAL_API_ENDPOINTS,
  type ExternalApiEndpoint,
  type EndpointSecurityInfo,
  type HttpsVerificationResult,
} from './httpsVerification';

// 通信タイムアウト設定
export {
  getTimeoutConfig,
  validateTimeoutConfig,
  toSeconds,
  toMilliseconds,
  TIMEOUT_CONFIG,
  type TimeoutSetting,
  type ServiceName,
  type ValidatedConfig,
  type TimeoutConfigResult,
} from './timeoutConfig';

// プライバシー・利用規約確認
export {
  getPrivacyPolicy,
  getExternalServiceCompliance,
  verifyNoThirdPartyDataSharing,
  EXTERNAL_SERVICES,
  type ExternalServiceName,
  type DataCollectionPolicy,
  type DataSharingPolicy,
  type DataRetentionPolicy,
  type PrivacyPolicy,
  type ExternalServiceCompliance,
  type ThirdPartyDataSharingResult,
} from './privacyCompliance';
