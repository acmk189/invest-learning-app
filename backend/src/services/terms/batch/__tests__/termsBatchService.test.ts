/**
 * 用語バッチサービスのテスト
 *
 * Task 11: 用語バッチ処理
 * Task 6: Supabase移行 (migration-to-supabase)
 * - 6.1 TermsBatchService Supabase対応
 * - 6.2 用語履歴保存処理
 * - 6.3 用語メタデータ更新処理
 * - 6.4 用語バッチエラーハンドリング更新
 * - 6.5 用語バッチテスト更新
 *
 * Requirements:
 * - 1.1 (毎日8:00に実行)
 * - 4.1 (1日3つ投資用語生成)
 * - 4.4 (初級〜上級難易度混在)
 * - 4.5 (用語データSupabase保存)
 * - 4.6 (全履歴保持)
 *
 * TDDのRED→GREEN→REFACTORサイクルで実装
 */

import { TermsBatchService, TermsBatchServiceConfig } from '../termsBatchService';
import { TermGenerationService, TermGenerationResult, GenerateTermOptions } from '../../termGenerationService';
import { TermDifficulty } from '../../../../models/terms.model';

// Supabaseクライアントのモック
// newsBatchService.test.ts と同じパターンでモックを構成
const mockSupabaseFrom = jest.fn();
const mockSupabaseInsert = jest.fn();
const mockSupabaseUpsert = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseSingle = jest.fn();

const mockSupabaseClient = {
  from: mockSupabaseFrom,
};

/**
 * チェーンメソッドの設定
 *
 * terms/terms_history: insert() -> Promise (複数行挿入のためsingle()なし)
 * batch_metadata: update() -> eq() -> select() -> single() -> Promise
 */
mockSupabaseFrom.mockImplementation(() => ({
  insert: mockSupabaseInsert,
  upsert: mockSupabaseUpsert,
  update: mockSupabaseUpdate,
  select: mockSupabaseSelect,
}));

// insert: 複数行挿入のためsingle()を使用しない(直接Promiseを返す)
mockSupabaseInsert.mockResolvedValue({ data: [{ id: 1 }], error: null });

mockSupabaseUpsert.mockImplementation(() => ({
  select: mockSupabaseSelect,
}));

mockSupabaseUpdate.mockImplementation(() => ({
  eq: mockSupabaseEq,
}));

mockSupabaseEq.mockImplementation(() => ({
  select: mockSupabaseSelect,
}));

mockSupabaseSelect.mockImplementation(() => ({
  single: mockSupabaseSingle,
}));

// デフォルトで成功を返す(metadata更新用)
mockSupabaseSingle.mockResolvedValue({ data: { id: 1 }, error: null });

jest.mock('../../../../config/supabase', () => ({
  getSupabase: () => mockSupabaseClient,
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

describe('TermsBatchService', () => {
  let mockGenerationService: jest.Mocked<TermGenerationService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Supabaseモックのリセット
    mockSupabaseFrom.mockImplementation(() => ({
      insert: mockSupabaseInsert,
      upsert: mockSupabaseUpsert,
      update: mockSupabaseUpdate,
      select: mockSupabaseSelect,
    }));
    // insert: 複数行挿入のためsingle()を使用しない(直接Promiseを返す)
    mockSupabaseInsert.mockResolvedValue({ data: [{ id: 1 }], error: null });
    mockSupabaseUpsert.mockImplementation(() => ({
      select: mockSupabaseSelect,
    }));
    mockSupabaseUpdate.mockImplementation(() => ({
      eq: mockSupabaseEq,
    }));
    mockSupabaseEq.mockImplementation(() => ({
      select: mockSupabaseSelect,
    }));
    mockSupabaseSelect.mockImplementation(() => ({
      single: mockSupabaseSingle,
    }));
    // metadata更新用(single()を使用)
    mockSupabaseSingle.mockResolvedValue({ data: { id: 1 }, error: null });

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
        saveToDatabase: false,
        timeoutMs: 60000,
      };
      const service = new TermsBatchService(mockGenerationService, config);

      const retrievedConfig = service.getConfig();
      expect(retrievedConfig.saveToDatabase).toBe(false);
      expect(retrievedConfig.timeoutMs).toBe(60000);
    });

    it('デフォルト設定が適用されること', () => {
      const service = new TermsBatchService(mockGenerationService);

      const config = service.getConfig();
      expect(config.saveToDatabase).toBe(true);
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

      const service = new TermsBatchService(mockGenerationService, {
        saveToDatabase: false,
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

      const service = new TermsBatchService(mockGenerationService, {
        saveToDatabase: false,
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

      const service = new TermsBatchService(mockGenerationService, {
        saveToDatabase: false,
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

  describe('Task 6.1: Supabase用語保存機能', () => {
    it('3つの用語をSupabaseに保存すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      // termsテーブルに保存されること
      expect(mockSupabaseFrom).toHaveBeenCalledWith('terms');
      expect(mockSupabaseInsert).toHaveBeenCalled();
      expect(result.databaseSaved).toBe(true);
    });

    it('用語ごとにinsertペイロードを正しく構成すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // insertの呼び出しを確認
      const insertPayload = mockSupabaseInsert.mock.calls[0][0];
      expect(Array.isArray(insertPayload)).toBe(true);
      expect(insertPayload).toHaveLength(3);

      // 各用語のペイロード構造を検証
      insertPayload.forEach((term: Record<string, unknown>) => {
        expect(term).toHaveProperty('date');
        expect(term).toHaveProperty('name');
        expect(term).toHaveProperty('description');
        expect(term).toHaveProperty('difficulty');
      });
    });

    it('ドキュメントIDが今日の日付であること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // 今日の日付でinsertされること
      const today = new Date().toISOString().split('T')[0];
      const insertPayload = mockSupabaseInsert.mock.calls[0][0] as Array<{ date: string }>;
      insertPayload.forEach((term) => {
        expect(term.date).toBe(today);
      });
    });

    it('保存成功・失敗をログに記録すること', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // 保存成功ログが出力されること
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TermsBatchService]')
      );

      consoleSpy.mockRestore();
    });

    it('保存失敗時にエラーログを記録する', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      // insertの失敗をシミュレート(複数行挿入のため直接Promiseを返す)
      mockSupabaseInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Supabase Error', code: '23505' },
      });

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      expect(result.databaseSaved).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'database-save',
        })
      );
    });

    it('saveToDatabase=falseの場合は保存しない', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const noSaveService = new TermsBatchService(mockGenerationService, {
        saveToDatabase: false,
      });

      await noSaveService.execute();

      // terms テーブルへの保存が呼ばれていないこと
      expect(mockSupabaseInsert).not.toHaveBeenCalled();
    });
  });

  describe('Task 6.2: 用語履歴保存機能', () => {
    it('配信済み用語をterms_historyテーブルに追加すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      // terms_historyテーブルに追加されること
      expect(mockSupabaseFrom).toHaveBeenCalledWith('terms_history');
      expect(result.historyUpdated).toBe(true);
    });

    it('3つの用語すべてを履歴に追加すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // terms_historyへのinsertを確認
      // terms と terms_history の両方でinsertが呼ばれる
      // terms_history のinsertコールを特定
      const historyInsertCall = mockSupabaseInsert.mock.calls.find(
        (call) => {
          const payload = call[0];
          return Array.isArray(payload) && payload[0]?.term_name !== undefined;
        }
      );
      expect(historyInsertCall).toBeDefined();
      expect(historyInsertCall?.[0]).toHaveLength(3);
    });

    it('履歴データに用語名、配信日時、難易度が含まれること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // terms_historyへのinsertを確認
      const historyInsertCall = mockSupabaseInsert.mock.calls.find(
        (call) => {
          const payload = call[0];
          return Array.isArray(payload) && payload[0]?.term_name !== undefined;
        }
      );

      expect(historyInsertCall).toBeDefined();
      const historyPayload = historyInsertCall?.[0] as Array<Record<string, unknown>>;
      historyPayload.forEach((history) => {
        expect(history).toHaveProperty('term_name');
        expect(history).toHaveProperty('delivered_at');
        expect(history).toHaveProperty('difficulty');
        // ISO 8601形式のタイムスタンプであることを確認
        expect(history.delivered_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });
  });

  describe('Task 6.3: 用語メタデータ更新機能', () => {
    it('バッチ完了時にbatch_metadata.terms_last_updatedを更新すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      // batch_metadataテーブルが更新されること
      expect(mockSupabaseFrom).toHaveBeenCalledWith('batch_metadata');
      expect(mockSupabaseUpdate).toHaveBeenCalled();
      expect(result.metadataUpdated).toBe(true);
    });

    it('メタデータ更新にISO 8601タイムスタンプが含まれること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // updateの呼び出しを確認
      const updatePayload = mockSupabaseUpdate.mock.calls[0][0];
      expect(updatePayload).toHaveProperty('terms_last_updated');
      // ISO 8601形式のタイムスタンプであることを確認
      expect(updatePayload.terms_last_updated).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it('更新成功・失敗をログに記録すること', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      // メタデータ更新ログが出力されること
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metadata updated')
      );

      consoleSpy.mockRestore();
    });

    it('メタデータ更新失敗時はエラーログを記録するが処理は継続する', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      // terms insert, terms_history insert成功(どちらも直接Promiseを返す)
      // -> insertは2回呼ばれる
      mockSupabaseInsert
        .mockResolvedValueOnce({ data: [{ id: 1 }], error: null }) // terms
        .mockResolvedValueOnce({ data: [{ id: 1 }], error: null }); // terms_history

      // metadata update失敗(single()を使用)
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Metadata Error', code: '42P01' },
      });

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      expect(result.metadataUpdated).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'metadata-update',
        })
      );
    });
  });

  describe('バッチ処理結果', () => {
    it('処理時間を記録すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      // 処理時間が記録されていること(0以上であればOK、高速実行では0msになることもある)
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('処理日付を記録すること', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      const result = await service.execute();

      const today = new Date().toISOString().split('T')[0];
      expect(result.date).toBe(today);
    });

    it('エラー発生時にエラー情報を記録すること', async () => {
      mockGenerationService.generateTerm
        .mockRejectedValueOnce(new Error('API Error'));

      const service = new TermsBatchService(mockGenerationService, {
        saveToDatabase: false,
      });

      const result = await service.execute();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('タイムアウト制御', () => {
    it('5分以内にバッチ処理が完了する', async () => {
      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const startTime = Date.now();
      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(300000); // 5分 = 300,000ms
    });

    it('タイムアウト時にエラーを返す', async () => {
      // タイムアウトをシミュレート
      const shortTimeoutService = new TermsBatchService(
        mockGenerationService,
        { timeoutMs: 1, saveToDatabase: false } // 1ms, DBへ保存しない
      );

      // 永久にpendingになるPromiseを返す(resolveしない)
      // これにより、テスト終了後に非同期処理が実行されることを防ぐ
      mockGenerationService.generateTerm.mockReturnValue(
        new Promise(() => {
          // 意図的にresolve/rejectしない
        })
      );

      const result = await shortTimeoutService.execute();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'timeout',
        })
      );
    });

    it('処理時間をログに記録する', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockGenerationService.generateTerm
        .mockResolvedValueOnce(createMockTermResult('PER', 'beginner'))
        .mockResolvedValueOnce(createMockTermResult('信用取引', 'intermediate'))
        .mockResolvedValueOnce(createMockTermResult('デリバティブ', 'advanced'));

      const service = new TermsBatchService(mockGenerationService);

      await service.execute();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TermsBatchService]')
      );
      consoleSpy.mockRestore();
    });
  });
});
