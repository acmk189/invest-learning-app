/**
 * ニュース部分成功検出・ハンドリングのテスト
 *
 * Task 9.3: ニュース部分成功検出・ハンドリング
 *
 * Requirements:
 * - 8.2 (98%以上バッチ成功率)
 *
 * 世界ニュースまたは日本ニュースの一方のみ成功した場合の
 * 検出と適切なハンドリングをテストする
 */

import {
  PartialSuccessHandler,
  PartialSuccessType,
  PartialSuccessResult,
  PartialSuccessNotification,
} from '../newsBatchPartialSuccessHandler';
import { NewsBatchResult, NewsSummaryData } from '../newsBatchService';

describe('PartialSuccessHandler', () => {
  // サンプルデータ
  const createWorldNews = (): NewsSummaryData => ({
    title: '世界の投資・金融ニュース',
    summary: '世界ニュース要約',
    characterCount: 2000,
    updatedAt: new Date(),
  });

  const createJapanNews = (): NewsSummaryData => ({
    title: '日本の投資・金融ニュース',
    summary: '日本ニュース要約',
    characterCount: 2000,
    updatedAt: new Date(),
  });

  // 完全成功
  const createFullSuccessResult = (): NewsBatchResult => ({
    success: true,
    partialSuccess: false,
    firestoreSaved: true,
    metadataUpdated: true,
    processingTimeMs: 1000,
    date: '2026-01-02',
    worldNews: createWorldNews(),
    japanNews: createJapanNews(),
    errors: [],
  });

  // 完全失敗
  const createFullFailureResult = (): NewsBatchResult => ({
    success: false,
    partialSuccess: false,
    firestoreSaved: false,
    metadataUpdated: false,
    processingTimeMs: 500,
    date: '2026-01-02',
    errors: [
      {
        type: 'world-news-fetch',
        message: 'エラー1',
        timestamp: new Date(),
      },
      {
        type: 'japan-news-fetch',
        message: 'エラー2',
        timestamp: new Date(),
      },
    ],
  });

  // 世界ニュースのみ成功
  const createWorldNewsOnlyResult = (): NewsBatchResult => ({
    success: false,
    partialSuccess: true,
    firestoreSaved: true,
    metadataUpdated: true,
    processingTimeMs: 800,
    date: '2026-01-02',
    worldNews: createWorldNews(),
    errors: [
      {
        type: 'japan-news-fetch',
        message: '日本ニュース取得エラー',
        timestamp: new Date(),
      },
    ],
  });

  // 日本ニュースのみ成功
  const createJapanNewsOnlyResult = (): NewsBatchResult => ({
    success: false,
    partialSuccess: true,
    firestoreSaved: true,
    metadataUpdated: true,
    processingTimeMs: 800,
    date: '2026-01-02',
    japanNews: createJapanNews(),
    errors: [
      {
        type: 'world-news-fetch',
        message: '世界ニュース取得エラー',
        timestamp: new Date(),
      },
    ],
  });

  let handler: PartialSuccessHandler;

  beforeEach(() => {
    handler = new PartialSuccessHandler();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('部分成功の検出', () => {
    it('完全成功を正しく判定する', () => {
      const result = handler.analyze(createFullSuccessResult());

      expect(result.isPartialSuccess).toBe(false);
      expect(result.type).toBe(PartialSuccessType.FULL_SUCCESS);
    });

    it('完全失敗を正しく判定する', () => {
      const result = handler.analyze(createFullFailureResult());

      expect(result.isPartialSuccess).toBe(false);
      expect(result.type).toBe(PartialSuccessType.FULL_FAILURE);
    });

    it('世界ニュースのみ成功を検出する', () => {
      const result = handler.analyze(createWorldNewsOnlyResult());

      expect(result.isPartialSuccess).toBe(true);
      expect(result.type).toBe(PartialSuccessType.WORLD_NEWS_ONLY);
    });

    it('日本ニュースのみ成功を検出する', () => {
      const result = handler.analyze(createJapanNewsOnlyResult());

      expect(result.isPartialSuccess).toBe(true);
      expect(result.type).toBe(PartialSuccessType.JAPAN_NEWS_ONLY);
    });
  });

  describe('部分成功の詳細情報', () => {
    it('成功したニュースの情報を含む', () => {
      const result = handler.analyze(createWorldNewsOnlyResult());

      expect(result.successfulNews).toContain('world');
      expect(result.successfulNews).not.toContain('japan');
    });

    it('失敗したニュースの情報を含む', () => {
      const result = handler.analyze(createWorldNewsOnlyResult());

      expect(result.failedNews).toContain('japan');
      expect(result.failedNews).not.toContain('world');
    });

    it('失敗の理由を含む', () => {
      const result = handler.analyze(createWorldNewsOnlyResult());

      expect(result.failureReasons).toHaveLength(1);
      expect(result.failureReasons[0]).toContain('日本ニュース取得エラー');
    });
  });

  describe('部分成功時の保存判断', () => {
    it('部分成功でも保存を許可する', () => {
      const result = handler.analyze(createWorldNewsOnlyResult());

      expect(result.shouldSave).toBe(true);
    });

    it('完全失敗では保存しない', () => {
      const result = handler.analyze(createFullFailureResult());

      expect(result.shouldSave).toBe(false);
    });

    it('完全成功では保存する', () => {
      const result = handler.analyze(createFullSuccessResult());

      expect(result.shouldSave).toBe(true);
    });
  });

  describe('通知機能', () => {
    it('部分成功時に通知情報を生成する', () => {
      const analysisResult = handler.analyze(createWorldNewsOnlyResult());
      const notification = handler.createNotification(
        analysisResult,
        '2026-01-02'
      );

      expect(notification.title).toContain('部分成功');
      expect(notification.severity).toBe('warning');
    });

    it('完全失敗時に通知情報を生成する', () => {
      const analysisResult = handler.analyze(createFullFailureResult());
      const notification = handler.createNotification(
        analysisResult,
        '2026-01-02'
      );

      expect(notification.title).toContain('失敗');
      expect(notification.severity).toBe('error');
    });

    it('完全成功時は通知しない', () => {
      const analysisResult = handler.analyze(createFullSuccessResult());
      const notification = handler.createNotification(
        analysisResult,
        '2026-01-02'
      );

      expect(notification.severity).toBe('info');
    });

    it('通知にエラー詳細を含む', () => {
      const analysisResult = handler.analyze(createWorldNewsOnlyResult());
      const notification = handler.createNotification(
        analysisResult,
        '2026-01-02'
      );

      expect(notification.details).toBeDefined();
      expect(notification.details.failedNews).toContain('japan');
    });
  });

  describe('ログ出力', () => {
    it('部分成功時に警告ログを出力する', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      handler.logPartialSuccess(createWorldNewsOnlyResult());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PartialSuccessHandler]'),
        expect.any(String)
      );
    });

    it('部分成功時に成功したニュースを出力する', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      handler.logPartialSuccess(createWorldNewsOnlyResult());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PartialSuccessHandler]'),
        expect.stringContaining('world')
      );
    });
  });

  describe('PartialSuccessType列挙型', () => {
    it('全ての成功タイプが定義されている', () => {
      expect(PartialSuccessType.FULL_SUCCESS).toBeDefined();
      expect(PartialSuccessType.WORLD_NEWS_ONLY).toBeDefined();
      expect(PartialSuccessType.JAPAN_NEWS_ONLY).toBeDefined();
      expect(PartialSuccessType.FULL_FAILURE).toBeDefined();
    });
  });

  describe('処理のスキップ判断', () => {
    it('部分成功でリトライ不要と判断する', () => {
      const result = handler.analyze(createWorldNewsOnlyResult());

      expect(result.shouldRetry).toBe(false);
    });

    it('完全失敗ではリトライを推奨する', () => {
      const result = handler.analyze(createFullFailureResult());

      expect(result.shouldRetry).toBe(true);
    });

    it('完全成功ではリトライ不要', () => {
      const result = handler.analyze(createFullSuccessResult());

      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('結果の構造', () => {
    it('分析結果が正しい構造を持つ', () => {
      const result = handler.analyze(createWorldNewsOnlyResult());

      expect(result).toHaveProperty('isPartialSuccess');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('successfulNews');
      expect(result).toHaveProperty('failedNews');
      expect(result).toHaveProperty('failureReasons');
      expect(result).toHaveProperty('shouldSave');
      expect(result).toHaveProperty('shouldRetry');
    });

    it('通知が正しい構造を持つ', () => {
      const analysisResult = handler.analyze(createWorldNewsOnlyResult());
      const notification = handler.createNotification(
        analysisResult,
        '2026-01-02'
      );

      expect(notification).toHaveProperty('title');
      expect(notification).toHaveProperty('message');
      expect(notification).toHaveProperty('severity');
      expect(notification).toHaveProperty('timestamp');
      expect(notification).toHaveProperty('details');
    });
  });
});
