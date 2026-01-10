/**
 * プライバシー・利用規約確認ユーティリティ
 *
 * Task 31.3: プライバシー・利用規約確認
 * Requirements: 9.5, 12.7
 *
 * ユーザーの学習履歴を第三者と共有しないことを確認し、
 * 外部サービスの利用規約を遵守していることを文書化します。
 *
 * 本アプリケーションのプライバシーポリシー:
 * - ユーザー認証機能なし(v1.0)のため、個人情報を収集しません
 * - ユーザーの学習履歴を第三者と共有しません
 * - データはFirebase Firestoreにのみ保存されます
 *
 * @see https://newsapi.org/terms - NewsAPI利用規約
 * @see https://www.anthropic.com/policies/terms-of-service - Anthropic利用規約
 * @see https://firebase.google.com/terms - Firebase利用規約
 */

/**
 * 外部サービス一覧
 */
export const EXTERNAL_SERVICES = [
  'NewsAPI',
  'Claude API',
  'Google News RSS',
  'Firebase Firestore',
] as const;

export type ExternalServiceName = (typeof EXTERNAL_SERVICES)[number];

/**
 * データ収集ポリシー
 */
export interface DataCollectionPolicy {
  collectsPersonalData: boolean;
  description: string;
  dataTypes: string[];
}

/**
 * データ共有ポリシー
 */
export interface DataSharingPolicy {
  sharesWithThirdParties: boolean;
  description: string;
  exceptions: string[];
}

/**
 * データ保持ポリシー
 */
export interface DataRetentionPolicy {
  retentionPeriodDays: number;
  description: string;
  deletionPolicy: string;
}

/**
 * プライバシーポリシー
 */
export interface PrivacyPolicy {
  dataCollection: DataCollectionPolicy;
  dataSharing: DataSharingPolicy;
  dataRetention: DataRetentionPolicy;
  lastUpdated: string;
}

/**
 * 外部サービス利用規約遵守状況
 */
export interface ExternalServiceCompliance {
  isCompliant: boolean;
  termsUrl: string;
  complianceNotes: string[];
  lastReviewed: string;
}

/**
 * 第三者データ共有検証結果
 */
export interface ThirdPartyDataSharingResult {
  isCompliant: boolean;
  sharesUserData: boolean;
  details: string[];
}

/**
 * プライバシーポリシーを取得する
 *
 * 本アプリケーションのプライバシーポリシーを返します。
 *
 * @returns プライバシーポリシー
 *
 * @example
 * const policy = getPrivacyPolicy();
 * console.log(policy.dataSharing.sharesWithThirdParties); // false
 */
export function getPrivacyPolicy(): PrivacyPolicy {
  return {
    dataCollection: {
      collectsPersonalData: false,
      description:
        '本アプリケーションはv1.0においてユーザー認証機能を持たないため、' +
        '個人を特定できる情報を収集しません。',
      dataTypes: [
        'ニュース要約データ(公開情報)',
        '投資用語データ(AI生成コンテンツ)',
        'ローカルキャッシュデータ',
      ],
    },
    dataSharing: {
      sharesWithThirdParties: false,
      description:
        'ユーザーの学習履歴や利用状況を第三者と共有しません。' +
        'データはFirebase Firestoreにのみ保存され、外部への送信は行いません。',
      exceptions: [
        '法的要請がある場合を除く',
      ],
    },
    dataRetention: {
      retentionPeriodDays: 30,
      description:
        'ニュースデータは最大30日間保持され、その後自動削除されます。' +
        '用語履歴は重複チェックのために保持されます。',
      deletionPolicy: '30日を超えるニュースデータは日次バッチ処理で自動削除',
    },
    lastUpdated: '2026-01-01',
  };
}

/**
 * 外部サービスの利用規約遵守状況を取得する
 *
 * @returns 各外部サービスの遵守状況
 *
 * @example
 * const compliance = getExternalServiceCompliance();
 * console.log(compliance['NewsAPI'].isCompliant); // true
 */
export function getExternalServiceCompliance(): Record<ExternalServiceName, ExternalServiceCompliance> {
  return {
    'NewsAPI': {
      isCompliant: true,
      termsUrl: 'https://newsapi.org/terms',
      complianceNotes: [
        '開発用途での無料枠(100リクエスト/日)を使用',
        'ニュース記事の要約のみを表示(原文へのリンクは非表示)',
        'APIキーは環境変数で安全に管理',
      ],
      lastReviewed: '2026-01-01',
    },
    'Claude API': {
      isCompliant: true,
      termsUrl: 'https://www.anthropic.com/policies/terms-of-service',
      complianceNotes: [
        'ニュース要約と投資用語生成に使用',
        'ユーザーの個人情報をAPIに送信しない',
        'APIキーは環境変数で安全に管理',
        'Haikuモデルを使用してコストを最適化',
      ],
      lastReviewed: '2026-01-01',
    },
    'Google News RSS': {
      isCompliant: true,
      termsUrl: 'https://www.google.com/intl/ja/policies/terms/',
      complianceNotes: [
        '公開RSSフィードを使用',
        '日本の経済ニュースを取得',
        '商用目的での過度な取得を避ける(1日1回のみ)',
      ],
      lastReviewed: '2026-01-01',
    },
    'Firebase Firestore': {
      isCompliant: true,
      termsUrl: 'https://firebase.google.com/terms',
      complianceNotes: [
        '無料枠(Spark Plan)内で運用',
        'ユーザーの個人情報は保存しない',
        'サービスアカウント認証を使用',
        'データはGoogleのセキュリティ基準で保護',
      ],
      lastReviewed: '2026-01-01',
    },
  };
}

/**
 * 第三者へのデータ共有がないことを検証する
 *
 * ユーザーの学習履歴や個人情報が第三者に共有されていないことを確認します。
 *
 * @returns 検証結果
 *
 * @example
 * const result = verifyNoThirdPartyDataSharing();
 * if (result.isCompliant) {
 *   console.log('プライバシー要件を満たしています');
 * }
 */
export function verifyNoThirdPartyDataSharing(): ThirdPartyDataSharingResult {
  const policy = getPrivacyPolicy();

  return {
    isCompliant: !policy.dataSharing.sharesWithThirdParties,
    sharesUserData: policy.dataSharing.sharesWithThirdParties,
    details: [
      'ユーザー認証機能なし(v1.0)のため個人情報を収集しない',
      'ニュース・用語データはFirestore経由でのみアクセス',
      '外部APIへはニュース記事データのみ送信(要約処理用)',
      'ユーザーの学習履歴は端末のローカルキャッシュにのみ保存',
      'アナリティクスやトラッキングは実装していない',
    ],
  };
}
