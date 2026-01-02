/**
 * 配信済み用語取得機能テスト
 * Task 10.1: 配信済み用語取得機能
 *
 * Firestore terms_historyコレクションから過去30日分の
 * 配信済み用語を取得する機能をテストします。
 *
 * Requirements: 4.3 (過去30日以内に配信した用語を除外)
 */

import { Firestore } from 'firebase-admin/firestore';
import {
  TermHistoryRepository,
  TermHistoryEntry,
  TermHistoryQuery,
} from '../termHistoryRepository';
import { TermDifficulty } from '../../../../models/terms.model';

// Firestoreのモック
const mockWhere = jest.fn();
const mockGet = jest.fn();
const mockCollection = jest.fn();

const mockFirestore = {
  collection: mockCollection,
} as unknown as Firestore;

describe('TermHistoryRepository', () => {
  let repository: TermHistoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    // チェーンを正しくモック
    mockCollection.mockReturnValue({
      where: mockWhere,
    });

    mockWhere.mockReturnValue({
      where: mockWhere,
      get: mockGet,
    });

    repository = new TermHistoryRepository(mockFirestore);
  });

  describe('getDeliveredTerms', () => {
    it('過去30日分の配信済み用語を取得できる', async () => {
      // Arrange
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            termName: 'PER',
            deliveredAt: new Date('2025-12-15'),
            difficulty: 'beginner' as TermDifficulty,
          }),
        },
        {
          id: 'doc2',
          data: () => ({
            termName: 'PBR',
            deliveredAt: new Date('2025-12-16'),
            difficulty: 'intermediate' as TermDifficulty,
          }),
        },
        {
          id: 'doc3',
          data: () => ({
            termName: 'ROE',
            deliveredAt: new Date('2025-12-17'),
            difficulty: 'advanced' as TermDifficulty,
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 3,
      });

      // Act
      const result = await repository.getDeliveredTerms(30);

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('terms_history');
      expect(mockWhere).toHaveBeenCalledWith(
        'deliveredAt',
        '>=',
        expect.any(Date)
      );
      expect(result).toHaveLength(3);
      expect(result[0].termName).toBe('PER');
      expect(result[1].termName).toBe('PBR');
      expect(result[2].termName).toBe('ROE');
    });

    it('配信済み用語がない場合は空配列を返す', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      });

      // Act
      const result = await repository.getDeliveredTerms(30);

      // Assert
      expect(result).toEqual([]);
    });

    it('日数を指定して配信済み用語を取得できる', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      });

      // Act
      await repository.getDeliveredTerms(7); // 7日間

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('terms_history');
      expect(mockWhere).toHaveBeenCalledWith(
        'deliveredAt',
        '>=',
        expect.any(Date)
      );
    });

    it('デフォルトで30日分の用語を取得する', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      });

      // Act
      await repository.getDeliveredTerms();

      // Assert
      // 30日前の日付が正しく計算されていることを確認
      const whereCall = mockWhere.mock.calls[0];
      const dateArg = whereCall[2] as Date;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 日付が30日前の1日以内であることを確認
      const diff = Math.abs(dateArg.getTime() - thirtyDaysAgo.getTime());
      expect(diff).toBeLessThan(60 * 1000); // 1分以内の誤差を許容
    });
  });

  describe('getDeliveredTermNames', () => {
    it('用語名のリストを取得できる', async () => {
      // Arrange
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            termName: 'PER',
            deliveredAt: new Date(),
            difficulty: 'beginner' as TermDifficulty,
          }),
        },
        {
          id: 'doc2',
          data: () => ({
            termName: 'PBR',
            deliveredAt: new Date(),
            difficulty: 'intermediate' as TermDifficulty,
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 2,
      });

      // Act
      const result = await repository.getDeliveredTermNames(30);

      // Assert
      expect(result).toEqual(['PER', 'PBR']);
    });

    it('空の場合は空配列を返す', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      });

      // Act
      const result = await repository.getDeliveredTermNames(30);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getDeliveredTermsWithQuery', () => {
    it('難易度でフィルタリングできる', async () => {
      // Arrange
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            termName: 'PER',
            deliveredAt: new Date(),
            difficulty: 'beginner' as TermDifficulty,
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs,
        empty: false,
        size: 1,
      });

      const query: TermHistoryQuery = {
        days: 30,
        difficulty: 'beginner',
      };

      // Act
      const result = await repository.getDeliveredTermsWithQuery(query);

      // Assert
      // difficultyでのwhereが呼ばれることを確認
      expect(mockWhere).toHaveBeenCalledWith('difficulty', '==', 'beginner');
      expect(result).toHaveLength(1);
    });

    it('件数上限を指定できる', async () => {
      // Arrange
      const mockLimit = jest.fn().mockReturnValue({
        get: mockGet,
      });

      mockWhere.mockReturnValue({
        where: mockWhere,
        limit: mockLimit,
        get: mockGet,
      });

      mockGet.mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      });

      const query: TermHistoryQuery = {
        days: 30,
        limit: 10,
      };

      // Act
      await repository.getDeliveredTermsWithQuery(query);

      // Assert
      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe('型定義の検証', () => {
    it('TermHistoryEntryの型が正しい', () => {
      // 型チェックのためのテスト
      const entry: TermHistoryEntry = {
        id: 'test-id',
        termName: 'PER',
        deliveredAt: new Date(),
        difficulty: 'beginner',
      };

      expect(entry.id).toBe('test-id');
      expect(entry.termName).toBe('PER');
      expect(entry.difficulty).toBe('beginner');
    });

    it('TermHistoryQueryの型が正しい', () => {
      // 型チェックのためのテスト
      const query: TermHistoryQuery = {
        days: 30,
        difficulty: 'advanced',
        limit: 100,
      };

      expect(query.days).toBe(30);
      expect(query.difficulty).toBe('advanced');
      expect(query.limit).toBe(100);
    });
  });
});
