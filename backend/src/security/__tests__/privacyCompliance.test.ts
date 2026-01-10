/**
 * プライバシー・利用規約確認テスト
 *
 * Task 31.3: プライバシー・利用規約確認
 * Requirements: 9.5, 12.7
 *
 * ユーザーの学習履歴を第三者と共有しないこと、
 * 外部サービスの利用規約を遵守していることを確認します。
 */

import {
  getPrivacyPolicy,
  getExternalServiceCompliance,
  verifyNoThirdPartyDataSharing,
  EXTERNAL_SERVICES,
} from '../privacyCompliance';

describe('privacyCompliance', () => {
  describe('getPrivacyPolicy', () => {
    it('プライバシーポリシーを返す', () => {
      const policy = getPrivacyPolicy();

      expect(policy).toBeDefined();
      expect(policy.dataCollection).toBeDefined();
      expect(policy.dataSharing).toBeDefined();
      expect(policy.dataRetention).toBeDefined();
    });

    it('データ収集ポリシーが適切に定義されている', () => {
      const policy = getPrivacyPolicy();

      expect(policy.dataCollection.collectsPersonalData).toBe(false);
      expect(policy.dataCollection.description).toBeDefined();
    });

    it('データ共有ポリシーで第三者共有がないことを確認できる', () => {
      const policy = getPrivacyPolicy();

      expect(policy.dataSharing.sharesWithThirdParties).toBe(false);
      expect(policy.dataSharing.description).toBeDefined();
    });

    it('データ保持ポリシーが定義されている', () => {
      const policy = getPrivacyPolicy();

      expect(policy.dataRetention.retentionPeriodDays).toBeDefined();
      expect(policy.dataRetention.description).toBeDefined();
    });
  });

  describe('EXTERNAL_SERVICES', () => {
    it('すべての外部サービスが定義されている', () => {
      expect(EXTERNAL_SERVICES).toContain('NewsAPI');
      expect(EXTERNAL_SERVICES).toContain('Claude API');
      expect(EXTERNAL_SERVICES).toContain('Google News RSS');
      expect(EXTERNAL_SERVICES).toContain('Firebase Firestore');
    });
  });

  describe('getExternalServiceCompliance', () => {
    it('各外部サービスの利用規約遵守状況を返す', () => {
      const compliance = getExternalServiceCompliance();

      expect(Object.keys(compliance).length).toBe(EXTERNAL_SERVICES.length);
    });

    it('NewsAPIの利用規約遵守状況が定義されている', () => {
      const compliance = getExternalServiceCompliance();

      expect(compliance['NewsAPI']).toBeDefined();
      expect(compliance['NewsAPI'].isCompliant).toBe(true);
      expect(compliance['NewsAPI'].termsUrl).toBeDefined();
      expect(compliance['NewsAPI'].complianceNotes).toBeDefined();
    });

    it('Claude APIの利用規約遵守状況が定義されている', () => {
      const compliance = getExternalServiceCompliance();

      expect(compliance['Claude API']).toBeDefined();
      expect(compliance['Claude API'].isCompliant).toBe(true);
      expect(compliance['Claude API'].termsUrl).toContain('anthropic.com');
    });

    it('Firebase Firestoreの利用規約遵守状況が定義されている', () => {
      const compliance = getExternalServiceCompliance();

      expect(compliance['Firebase Firestore']).toBeDefined();
      expect(compliance['Firebase Firestore'].isCompliant).toBe(true);
      expect(compliance['Firebase Firestore'].termsUrl).toContain('firebase.google.com');
    });
  });

  describe('verifyNoThirdPartyDataSharing', () => {
    it('第三者へのデータ共有がないことを確認できる', () => {
      const result = verifyNoThirdPartyDataSharing();

      expect(result.isCompliant).toBe(true);
      expect(result.sharesUserData).toBe(false);
    });

    it('検証結果に詳細情報が含まれている', () => {
      const result = verifyNoThirdPartyDataSharing();

      expect(result.details).toBeDefined();
      expect(result.details.length).toBeGreaterThan(0);
    });
  });
});
