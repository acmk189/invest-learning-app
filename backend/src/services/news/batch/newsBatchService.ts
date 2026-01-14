/**
 * ニュースバッチサービス
 *
 * Task 8: ニュースバッチ処理
 * Task 5: Supabase移行 (migration-to-supabase)
 * - 5.1 NewsBatchService Supabase対応
 * - 5.2 ニュースメタデータ更新処理
 * - 5.3 ニュースバッチエラーハンドリング更新
 *
 * Requirements:
 * - 1.1 (毎日8:00にニュース取得)
 * - 1.2 (businessカテゴリで世界ニュース取得)
 * - 1.3 (Google News RSSから日本ニュース取得)
 * - 1.4 (複数記事を2000文字に要約)
 * - 1.5 (英語記事を日本語に翻訳+要約)
 * - 1.6 (Supabaseに保存)
 * - 1.8 (5分以内に完了)
 *
 * @see https://vercel.com/docs/functions/serverless-functions - Vercel Serverless Functions
 */

import { getSupabase } from '../../../config/supabase';
import { NewsUpsertPayload } from '../../../models/supabase.types';
import {
  WorldNewsFetcher,
  JapanNewsFetcher,
  NewsApiArticle,
  GoogleNewsRssItem,
} from '../fetchers';
import { NewsSummaryService, NewsArticle } from '../summarization';
import { AppError, ErrorType, ErrorSeverity } from '../../../errors/types';
import { formatDateToJST } from '../../../utils/dateUtils';

/**
 * デフォルトのタイムアウト時間(5分)
 *
 * Requirements 1.8: バッチ処理は5分以内に完了する必要がある
 */
const DEFAULT_TIMEOUT_MS = 300000;

/**
 * ニュースバッチエラー
 *
 * バッチ処理中に発生したエラーを表現する
 */
export class NewsBatchError extends AppError {
  /**
   * 操作名(例: 'world-news-fetch', 'japan-news-summary')
   */
  public readonly operation: string;

  constructor(message: string, operation: string, originalError?: Error) {
    super(message, ErrorType.API, ErrorSeverity.HIGH, true, originalError);
    this.name = 'NewsBatchError';
    this.operation = operation;
  }
}

/**
 * バッチ処理中のエラー情報
 */
export interface BatchErrorInfo {
  /** エラータイプ(どの処理で発生したか) */
  type: string;
  /** エラーメッセージ */
  message: string;
  /** 発生時刻 */
  timestamp: Date;
}

/**
 * ニュース要約結果(バッチ用)
 *
 * Firestoreに保存するためのデータ構造
 */
export interface NewsSummaryData {
  /** ニュースタイトル(自動生成) */
  title: string;
  /** 要約本文 */
  summary: string;
  /** 文字数 */
  characterCount: number;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * ニュースバッチ処理の結果
 */
export interface NewsBatchResult {
  /** 全処理が成功したかどうか */
  success: boolean;
  /** 部分的な成功 (片方のニュースだけ成功) かどうか */
  partialSuccess: boolean;
  /** 世界ニュースの要約データ */
  worldNews?: NewsSummaryData;
  /** 日本ニュースの要約データ */
  japanNews?: NewsSummaryData;
  /** データベースへの保存が成功したかどうか */
  databaseSaved: boolean;
  /** メタデータの更新が成功したかどうか */
  metadataUpdated: boolean;
  /** 処理時間 (ミリ秒) */
  processingTimeMs: number;
  /** 処理日付 (YYYY-MM-DD形式) */
  date: string;
  /** エラー情報 (発生した場合) */
  errors?: BatchErrorInfo[];
}

/**
 * ニュースバッチサービスの設定
 */
export interface NewsBatchServiceConfig {
  /**
   * タイムアウト時間 (ミリ秒)
   * @default 300000 (5分)
   */
  timeoutMs?: number;

  /**
   * データベースへ保存するかどうか
   * @default true
   */
  saveToDatabase?: boolean;
}

/**
 * ニュースバッチサービス
 *
 * 世界・日本のニュースを取得し、AI要約を行い、Firestoreに保存するバッチ処理を実行する
 *
 * @example
 * // 依存関係を注入してサービスを作成
 * const worldFetcher = new WorldNewsFetcher(newsApiClient);
 * const japanFetcher = new JapanNewsFetcher(rssParser);
 * const summaryService = new NewsSummaryService(claudeClient);
 * const batchService = new NewsBatchService(worldFetcher, japanFetcher, summaryService);
 *
 * // バッチ処理を実行
 * const result = await batchService.execute();
 * if (result.success) {
 *   console.log('ニュースバッチ処理が完了しました');
 * }
 */
export class NewsBatchService {
  private readonly worldNewsFetcher: WorldNewsFetcher;
  private readonly japanNewsFetcher: JapanNewsFetcher;
  private readonly summaryService: NewsSummaryService;
  private readonly timeoutMs: number;
  private readonly saveToDatabase: boolean;

  /**
   * コンストラクタ
   *
   * @param worldNewsFetcher - 世界ニュース取得サービス
   * @param japanNewsFetcher - 日本ニュース取得サービス
   * @param summaryService - ニュース要約サービス
   * @param config - サービス設定
   */
  constructor(
    worldNewsFetcher: WorldNewsFetcher,
    japanNewsFetcher: JapanNewsFetcher,
    summaryService: NewsSummaryService,
    config: NewsBatchServiceConfig = {}
  ) {
    this.worldNewsFetcher = worldNewsFetcher;
    this.japanNewsFetcher = japanNewsFetcher;
    this.summaryService = summaryService;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.saveToDatabase = config.saveToDatabase ?? true;
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): Required<NewsBatchServiceConfig> {
    return {
      timeoutMs: this.timeoutMs,
      saveToDatabase: this.saveToDatabase,
    };
  }

  /**
   * バッチ処理を実行
   *
   * 以下の処理を順次実行する:
   * 1. 世界・日本ニュースを並列取得
   * 2. AI要約処理
   * 3. Firestoreへ保存
   * 4. メタデータ更新
   *
   * @returns バッチ処理の結果
   */
  async execute(): Promise<NewsBatchResult> {
    const startTime = Date.now();
    const today = this.getTodayString();
    const errors: BatchErrorInfo[] = [];

    // 結果オブジェクトを初期化
    const result: NewsBatchResult = {
      success: false,
      partialSuccess: false,
      databaseSaved: false,
      metadataUpdated: false,
      processingTimeMs: 0,
      date: today,
      errors: [],
    };

    try {
      // タイムアウト制御付きで実行
      const processResult = await this.executeWithTimeout(today, errors);

      // 結果を統合
      result.worldNews = processResult.worldNews;
      result.japanNews = processResult.japanNews;

      // 成功判定
      const hasWorldNews = !!result.worldNews;
      const hasJapanNews = !!result.japanNews;
      result.success = hasWorldNews && hasJapanNews && errors.length === 0;
      result.partialSuccess = (hasWorldNews || hasJapanNews) && !result.success;

      // データベースへの保存
      if (this.saveToDatabase && (hasWorldNews || hasJapanNews)) {
        try {
          await this.saveNews(today, result.worldNews, result.japanNews);
          result.databaseSaved = true;
        } catch (error) {
          errors.push({
            type: 'database-save',
            message:
              error instanceof Error ? error.message : 'データベース保存でエラー',
            timestamp: new Date(),
          });
        }

        // メタデータ更新
        try {
          await this.updateMetadata();
          result.metadataUpdated = true;
        } catch (error) {
          errors.push({
            type: 'metadata-update',
            message:
              error instanceof Error ? error.message : 'メタデータ更新でエラー',
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      // タイムアウトまたは予期しないエラー
      if (error instanceof Error && error.message.includes('timeout')) {
        errors.push({
          type: 'timeout',
          message: `処理が${this.timeoutMs}ms以内に完了しませんでした`,
          timestamp: new Date(),
        });
      } else {
        errors.push({
          type: 'unknown',
          message: error instanceof Error ? error.message : '予期しないエラーが発生',
          timestamp: new Date(),
        });
      }
    }

    // 処理時間を計算
    result.processingTimeMs = Date.now() - startTime;
    result.errors = errors;

    // 処理完了ログ
    console.log(
      `[NewsBatchService] Batch completed in ${result.processingTimeMs}ms. Success: ${result.success}, PartialSuccess: ${result.partialSuccess}`
    );

    return result;
  }

  /**
   * タイムアウト制御付きでメイン処理を実行
   *
   * @param today - 今日の日付(YYYY-MM-DD)
   * @param errors - エラー情報を格納する配列
   * @returns 処理結果
   */
  private async executeWithTimeout(
    today: string,
    errors: BatchErrorInfo[]
  ): Promise<{
    worldNews?: NewsSummaryData;
    japanNews?: NewsSummaryData;
  }> {
    return new Promise((resolve, reject) => {
      // タイムアウトタイマー
      const timeoutId = setTimeout(() => {
        reject(new Error('Batch processing timeout'));
      }, this.timeoutMs);

      // メイン処理
      this.executeMainProcess(today, errors)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * メイン処理を実行
   *
   * @param today - 今日の日付(YYYY-MM-DD)
   * @param errors - エラー情報を格納する配列
   * @returns 処理結果
   */
  private async executeMainProcess(
    today: string,
    errors: BatchErrorInfo[]
  ): Promise<{
    worldNews?: NewsSummaryData;
    japanNews?: NewsSummaryData;
  }> {
    // 1. ニュースを並列取得
    const [worldArticles, japanItems] = await this.fetchNewsInParallel(errors);

    // 2. AI要約処理
    let worldNews: NewsSummaryData | undefined;
    let japanNews: NewsSummaryData | undefined;

    if (worldArticles.length > 0) {
      try {
        worldNews = await this.summarizeWorldNews(worldArticles);
      } catch (error) {
        errors.push({
          type: 'world-news-summary',
          message: error instanceof Error ? error.message : '世界ニュース要約でエラー',
          timestamp: new Date(),
        });
      }
    }

    if (japanItems.length > 0) {
      try {
        japanNews = await this.summarizeJapanNews(japanItems);
      } catch (error) {
        errors.push({
          type: 'japan-news-summary',
          message: error instanceof Error ? error.message : '日本ニュース要約で',
          timestamp: new Date(),
        });
      }
    }

    return { worldNews, japanNews };
  }

  /**
   * 世界・日本ニュースを並列取得
   *
   * Requirements 1.2: businessカテゴリで世界ニュースを取得
   * Requirements 1.3: Google News RSSから日本ニュースを取得
   *
   * @param errors - エラー情報を格納する配列
   * @returns [世界ニュース記事配列, 日本ニュース記事配列]
   */
  private async fetchNewsInParallel(
    errors: BatchErrorInfo[]
  ): Promise<[NewsApiArticle[], GoogleNewsRssItem[]]> {
    // 並列実行
    const [worldResult, japanResult] = await Promise.allSettled([
      this.worldNewsFetcher.fetchTopHeadlines({
        category: 'business',
        pageSize: 10,
      }),
      this.japanNewsFetcher.fetchJapanNews(),
    ]);

    // 結果を処理
    let worldArticles: NewsApiArticle[] = [];
    let japanItems: GoogleNewsRssItem[] = [];

    if (worldResult.status === 'fulfilled') {
      worldArticles = worldResult.value.articles;
    } else {
      errors.push({
        type: 'world-news-fetch',
        message: worldResult.reason?.message || '世界ニュース取得でエラー',
        timestamp: new Date(),
      });
    }

    if (japanResult.status === 'fulfilled') {
      japanItems = japanResult.value.items;
    } else {
      errors.push({
        type: 'japan-news-fetch',
        message: japanResult.reason?.message || '日本ニュース取得でエラー',
        timestamp: new Date(),
      });
    }

    return [worldArticles, japanItems];
  }

  /**
   * 世界ニュースを要約
   *
   * Requirements 1.4: 複数記事を2000文字に要約
   * Requirements 1.5: 英語記事を日本語に翻訳+要約
   *
   * @param articles - NewsAPI記事配列
   * @returns 要約データ
   */
  private async summarizeWorldNews(articles: NewsApiArticle[]): Promise<NewsSummaryData> {
    // NewsApiArticleをNewsArticleに変換
    const newsArticles: NewsArticle[] = articles.map((article) => ({
      title: article.title,
      description: article.description || '',
      content: article.content || '',
      source: article.source.name,
      publishedAt: article.publishedAt,
    }));

    // AI要約を実行
    const summaryResult = await this.summaryService.summarizeEnglishNews(newsArticles);

    return {
      title: '世界の投資・金融ニュース',
      summary: summaryResult.summary,
      characterCount: summaryResult.characterCount,
      updatedAt: new Date(),
    };
  }

  /**
   * 日本ニュースを要約
   *
   * Requirements 1.4: 複数記事を2000文字に要約
   *
   * @param items - Google News RSS記事配列
   * @returns 要約データ
   */
  private async summarizeJapanNews(items: GoogleNewsRssItem[]): Promise<NewsSummaryData> {
    // GoogleNewsRssItemをNewsArticleに変換
    const newsArticles: NewsArticle[] = items.map((item) => ({
      title: item.title,
      description: item.description || '',
      content: '', // RSSには本文がない
      source: item.source || 'Google News',
      publishedAt: item.publishedAt,
    }));

    // AI要約を実行
    const summaryResult = await this.summaryService.summarizeJapaneseNews(newsArticles);

    return {
      title: '日本の投資・金融ニュース',
      summary: summaryResult.summary,
      characterCount: summaryResult.characterCount,
      updatedAt: new Date(),
    };
  }

  /**
   * ニュースをSupabaseに保存
   *
   * Requirements 1.6: 処理完了後データベースに保存
   * Task 5.1: Supabase upsertに変更
   *
   * @param date - 日付 (YYYY-MM-DD形式、PRIMARY KEY)
   * @param worldNews - 世界ニュースデータ
   * @param japanNews - 日本ニュースデータ
   */
  private async saveNews(
    date: string,
    worldNews?: NewsSummaryData,
    japanNews?: NewsSummaryData
  ): Promise<void> {
    const supabase = getSupabase();

    // NewsUpsertPayloadを作成
    const payload: NewsUpsertPayload = {
      date,
      world_news_title: worldNews?.title ?? '',
      world_news_summary: worldNews?.summary ?? '',
      japan_news_title: japanNews?.title ?? '',
      japan_news_summary: japanNews?.summary ?? '',
      updated_at: new Date().toISOString(),
    };

    // Supabaseにupsert (日付をPKとして冪等性を確保)
    const { error } = await supabase
      .from('news')
      .upsert(payload, { onConflict: 'date' })
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    console.log(`[NewsBatchService] News saved to Supabase: ${date}`);
  }

  /**
   * メタデータを更新
   *
   * Task 5.2: batch_metadata.news_last_updatedを更新
   */
  private async updateMetadata(): Promise<void> {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('batch_metadata')
      .update({
        news_last_updated: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase metadata update failed: ${error.message}`);
    }

    console.log('[NewsBatchService] Metadata updated in Supabase');
  }

  /**
   * 今日の日付をYYYY-MM-DD形式で取得(JST)
   *
   * @returns 日付文字列(JST)
   */
  private getTodayString(): string {
    return formatDateToJST();
  }
}
