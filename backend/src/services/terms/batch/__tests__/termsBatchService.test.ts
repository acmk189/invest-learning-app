/**
 * 用語バッチサービスのテスト
 *
 * Task 11: 用語バッチ処理
 * TDDのRED→GREEN→REFACTORサイクルで実装
 */

import { TermsBatchService, TermsBatchServiceConfig } from '../termsBatchService';
import { TermGenerationService, TermGenerationResult, GenerateTermOptions } from '../../termGenerationService';
import { TermDifficulty } from '../../../../models/terms.model';
import * as firebase from '../../../../config/firebase';

// Firebaseモック
jest.mock('../../../../config/firebase', () => ({
  getFirestore: jest.fn(),
}));

/**
 * モック用語生成結果を作成
 */
function createMockTermResult(
  name: string,
  difficulty: TermDifficulty,
  characterCount: number = 500
): TermGenerationResult {
  return {
    term: {
      name,
      description: 'A'.repeat(characterCount),
      difficulty,
    },
    characterCount,
    isValid: characterCount >= 400 && characterCount <= 600,
    model: 'claude-3-haiku-20240307',
    inputTokens: 100,
    outputTokens: 200,
  };
}

/**
 * Firestoreモックを作成
 */
function createFirestoreMock() {
  const docSet = jest.fn().mockResolvedValue(undefined);
  const collectionAdd = jest.fn().mockResolvedValue({ id: 'mock-id' });
  const docRef = {
    set: docSet,
    get: jest.fn(),
  };
  const collectionRef = {
    doc: jest.fn().mockReturnValue(docRef),
    add: collectionAdd,
  };

  const firestoreMock = {
    collection: jest.fn().mockReturnValue(collectionRef),
    batch: jest.fn().mockReturnValue({
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    }),
  };

  (firebase.getFirestore as jest.Mock).mockReturnValue(firestoreMock);

  return { firestoreMock, docSet, collectionAdd, docRef, collectionRef };
}

describe('TermsBatchService', () => {
  let mockGenerationService: jest.Mocked<TermGenerationService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // TermGenerationServiceのモック作成
    mockGenerationService = {
      generateTerm: jest.fn(),
      getConfig: jest.fn().mockReturnValue({ maxRetries: 3, logErrors: true }),
    } as unknown as jest.Mocked<TermGenerationService>;
  });

  describe('Task 11.1: 用語バッチサービス基盤', () => {
    it('サービスを正しく初期化できること', () => {
      const service = new TermsBatchService(mockGenerationService);
      expect(service).toBeInstanceOf(TermsBatchService);
    });

    it('設定を正しく取得できること', () => {
      const config: TermsBatchServiceConfig = {
        saveToFirestore: false,
        timeoutMs: 60000,
      };
      const service = new TermsBatchService(mockGenerationService, config);

      const retrievedConfig = service.getConfig();
      expect(retrievedConfig.saveToFirestore).toBe(false);
      expect(retrievedConfig.timeoutMs).toBe(60000);
    });

    it('デフォルト設定が適用されること', () => {
      const service = new TermsBatchService(mockGenerationService);

      const config = service.getConfig();
      expect(config.saveToFirestore).toBe(true);
      expect(config.timeoutMs).toBe(300000); // 5分
    });
  });

  describe('Task 11.2: 3用語生成オーケストレーション', () => {
    it('初級・中級・上級の3つの用語を生成すること', async () => {
      // 各難易度の用語を生成するようモック設定
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService, {
        saveToFirestore: false,
      });

      const result = await service.execute();

      // 3回呼ばれること
      expect(mockGenerationService.generateTerm).toHaveBeenCalledTimes(3);

      // 各難易度で呼ばれること
      expect(mockGenerationService.generateTerm).toHaveBeenCalledWith(
        expect.objectContaining({ difficulty: 'beginner' })
      );
      expect(mockGenerationService.generateTerm).toHaveBeenCalledWith(
        expect.objectContaining({ difficulty: 'intermediate' })
      );
      expect(mockGenerationService.generateTerm).toHaveBeenCalledWith(
        expect.objectContaining({ difficulty: 'advanced' })
      );

      // 3つの用語が結果に含まれること
      expect(result.terms).toHaveLength(3);
      expect(result.success).toBe(true);
    });

    it('用語生成結果を正しく統合すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner', 450))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate', 500))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced', 550));

      createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService, {
        saveToFirestore: false,
      });

      const result = await service.execute();

      expect(result.terms?.[0].name).toBe('PER');
      expect(result.terms?.[0].difficulty).toBe('beginner');
      expect(result.terms?.[1].name).toBe('信用取引');
      expect(result.terms?.[1].difficulty).toBe('intermediate');
      expect(result.terms?.[2].name).toBe('デリバティブ');
      expect(result.terms?.[2].difficulty).toBe('advanced');
    });

    it('除外用語リストを次の生成に渡すこと', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService, {
        saveToFirestore: false,
      });

      await service.execute();

      // 2回目の呼び出しでは1つ目の用語が除外リストに
      const secondCall = mockGenerationService.generateTerm.mock.calls[1] as [GenerateTermOptions];
      expect(secondCall[0].excludeTerms).toContain('PER');

      // 3回目の呼び出しでは1,2つ目の用語が除外リストに
      const thirdCall = mockGenerationService.generateTerm.mock.calls[2] as [GenerateTermOptions];
      expect(thirdCall[0].excludeTerms).toContain('PER');
      expect(thirdCall[0].excludeTerms).toContain('信用取引');
    });
  });

  describe('Task 11.4: Firestore用語保存機能', () => {
    it('3つの用語をFirestoreに保存すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const { docSet, collectionRef } = createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      // termsコレクションに保存されること
      expect(collectionRef.doc).toHaveBeenCalled();
      expect(docSet).toHaveBeenCalled();

      // 保存データを確認
      const savedData = docSet.mock.calls.find(
        call => call[0]?.terms !== undefined
      )?.[0];
      expect(savedData.terms).toHaveLength(3);
      expect(savedData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.firestoreSaved).toBe(true);
    });

    it('ドキュメントIDが今日の日付であること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const { collectionRef } = createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // 今日の日付でドキュメントが作成されること
      const today = new Date().toISOString().split('T')[0];
      const docCalls = collectionRef.doc.mock.calls;
      const termsDocCall = docCalls.find(call => call[0] === today);
      expect(termsDocCall).toBeDefined();
    });

    it('保存成功・失敗をログに記録すること', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // 保存成功ログが出力されること
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TermsBatchService]')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Task 11.5: 用語履歴保存機能', () => {
    it('配信済み用語をterms_historyコレクションに追加すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const { firestoreMock } = createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      // terms_historyコレクションに追加されること
      expect(firestoreMock.collection).toHaveBeenCalledWith('terms_history');
      expect(result.historyUpdated).toBe(true);
    });

    it('3つの用語すべてを履歴に追加すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const { firestoreMock } = createFirestoreMock();
      const batchMock = firestoreMock.batch();

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // バッチ書き込みで3つの履歴が追加されること
      expect(batchMock.set).toHaveBeenCalledTimes(3);
      expect(batchMock.commit).toHaveBeenCalled();
    });

    it('履歴データに用語名、配信日時、難易度が含まれること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const { firestoreMock } = createFirestoreMock();
      const batchMock = firestoreMock.batch();

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // 履歴データの構造を確認
      const setCalls = (batchMock.set as jest.Mock).mock.calls;
      setCalls.forEach((call) => {
        const data = call[1];
        expect(data).toHaveProperty('termName');
        expect(data).toHaveProperty('deliveredAt');
        expect(data).toHaveProperty('difficulty');
      });
    });
  });

  describe('Task 11.6: 用語メタデータ更新機能', () => {
    it('バッチ完了時にmetadata/batch.termsLastUpdatedを更新すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const { firestoreMock } = createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      // metadataコレクションのbatchドキュメントが更新されること
      expect(firestoreMock.collection).toHaveBeenCalledWith('metadata');
      expect(result.metadataUpdated).toBe(true);
    });

    it('タイムスタンプが正しい形式であること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const { docSet } = createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // termsLastUpdatedがTimestamp型であること
      const metadataCall = docSet.mock.calls.find(
        call => call[0]?.termsLastUpdated !== undefined
      );
      expect(metadataCall).toBeDefined();
      expect(metadataCall?.[0].termsLastUpdated).toBeDefined();
    });

    it('更新成功・失敗をログに記録すること', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // メタデータ更新ログが出力されること
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metadata updated')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('バッチ処理結果', () => {
    it('処理時間を記録すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      // 処理時間が記録されていること（0以上であればOK、高速実行では0msになることもある）
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('処理日付を記録すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      const today = new Date().toISOString().split('T')[0];
      expect(result.date).toBe(today);
    });

    it('エラー発生時にエラー情報を記録すること', async () => {
      mockGenerationService.generateTerm
        .mockRejectedValueOnce(new Error('API Error'));

      createFirestoreMock();

      const service = new TermsBatchService(mockGenerationService, {
        saveToFirestore: false,
      });

      const result = await service.execute();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
