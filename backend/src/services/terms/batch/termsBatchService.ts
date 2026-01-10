/**
 * 用語バッチサービス
 *
 * Task 11: 用語バッチ処理
 * - 11.1 用語バッチAPIエンドポイント基盤(本ファイルと/api/batch/terms.tsで対応)
 * - 11.2 3用語生成オーケストレーション
 * - 11.4 Firestore用語保存機能
 * - 11.5 用語履歴保存機能
 * - 11.6 用語メタデータ更新機能
 *
 * Requirements:
 * - 1.1 (毎日8:00に実行)
 * - 4.1 (1日3つ投資用語生成)
 * - 4.4 (初級〜上級難易度混在)
 * - 4.5 (用語データFirestore保存)
 * - 4.6 (全履歴保持)
 *
 * @see https://vercel.com/docs/functions/serverless-functions - Vercel Serverless Functions
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getFirestore } from '../../../config/firebase';
import {
  TermGenerationService,
  GenerateTermOptions,
} from '../termGenerationService';
import {
  Term,
  TermDifficulty,
  createTermsDocument,
  createTermHistoryDocument,
} from '../../../models/terms.model';
import {
  METADATA_COLLECTION,
  BATCH_METADATA_DOC_ID,
} from '../../../models/metadata.model';
import { AppError, ErrorType, ErrorSeverity } from '../../../errors/types';

/**
 * デフォルトのタイムアウト時間(5分)
 *
 * Requirements 1.8: バッチ処理は5分以内に完了する必要がある
 */
const DEFAULT_TIMEOUT_MS = 300000;

/**
 * 生成する用語の難易度順序
 *
 * Requirements 4.4: 初級〜上級の難易度混在
 */
const DIFFICULTY_ORDER: TermDifficulty[] = ['beginner', 'intermediate', 'advanced'];

/**
 * 用語バッチエラー
 *
 * バッチ処理中に発生したエラーを表現する
 */
export class TermsBatchError extends AppError {
  /**
   * 操作名(例: 'term-generation', 'firestore-save')
   */
  public readonly operation: string;

  constructor(message: string, operation: string, originalError?: Error) {
    super(message, ErrorType.API, ErrorSeverity.HIGH, true, originalError);
    this.name = 'TermsBatchError';
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
 * 用語バッチ処理の結果
 */
export interface TermsBatchResult {
  /** 全処理が成功したかどうか */
  success: boolean;
  /** 部分的な成功(一部の用語だけ成功)かどうか */
  partialSuccess: boolean;
  /** 生成された用語の配列 */
  terms?: Term[];
  /** Firestoreへの保存が成功したかどうか */
  firestoreSaved: boolean;
  /** 用語履歴の更新が成功したかどうか */
  historyUpdated: boolean;
  /** メタデータの更新が成功したかどうか */
  metadataUpdated: boolean;
  /** 処理時間(ミリ秒) */
  processingTimeMs: number;
  /** 処理日付(YYYY-MM-DD形式) */
  date: string;
  /** エラー情報(発生した場合) */
  errors?: BatchErrorInfo[];
}

/**
 * 用語バッチサービスの設定
 */
export interface TermsBatchServiceConfig {
  /**
   * タイムアウト時間(ミリ秒)
   * @default 300000 (5分)
   */
  timeoutMs?: number;

  /**
   * Firestoreへ保存するかどうか
   * @default true
   */
  saveToFirestore?: boolean;
}

/**
 * 用語バッチサービス
 *
 * 3つの投資・金融用語を生成し、Firestoreに保存するバッチ処理を実行する
 *
 * @example
 * // TermGenerationServiceを注入してサービスを作成
 * const claudeClient = getClaudeClient();
 * const generationService = new TermGenerationService(claudeClient);
 * const batchService = new TermsBatchService(generationService);
 *
 * // バッチ処理を実行
 * const result = await batchService.execute();
 * if (result.success) {
 *   console.log('用語バッチ処理が完了しました');
 * }
 */
export class TermsBatchService {
  private readonly generationService: TermGenerationService;
  private readonly timeoutMs: number;
  private readonly saveToFirestore: boolean;

  /**
   * コンストラクタ
   *
   * @param generationService - 用語生成サービス
   * @param config - サービス設定
   */
  constructor(
    generationService: TermGenerationService,
    config: TermsBatchServiceConfig = {}
  ) {
    this.generationService = generationService;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.saveToFirestore = config.saveToFirestore ?? true;
  }

  /**
   * 現在の設定を取得
   *
   * @returns 設定オブジェクト
   */
  getConfig(): Required<TermsBatchServiceConfig> {
    return {
      timeoutMs: this.timeoutMs,
      saveToFirestore: this.saveToFirestore,
    };
  }

  /**
   * バッチ処理を実行
   *
   * 以下の処理を順次実行する:
   * 1. 初級・中級・上級の3つの用語を順次生成
   * 2. Firestoreへ保存
   * 3. 用語履歴を更新
   * 4. メタデータ更新
   *
   * @returns バッチ処理の結果
   */
  async execute(): Promise<TermsBatchResult> {
    const startTime = Date.now();
    const today = this.getTodayString();
    const errors: BatchErrorInfo[] = [];

    // 結果オブジェクトを初期化
    const result: TermsBatchResult = {
      success: false,
      partialSuccess: false,
      firestoreSaved: false,
      historyUpdated: false,
      metadataUpdated: false,
      processingTimeMs: 0,
      date: today,
      errors: [],
    };

    try {
      // タイムアウト制御付きで実行
      const processResult = await this.executeWithTimeout(errors);

      // 結果を統合
      result.terms = processResult.terms;

      // 成功判定
      const generatedCount = result.terms?.length ?? 0;
      result.success = generatedCount === 3 && errors.length === 0;
      result.partialSuccess = generatedCount > 0 && generatedCount < 3;

      // Firestoreへの保存
      if (this.saveToFirestore && generatedCount > 0) {
        try {
          await this.saveTerms(today, result.terms!);
          result.firestoreSaved = true;
          console.log(`[TermsBatchService] Terms saved to Firestore: ${today}`);
        } catch (error) {
          errors.push({
            type: 'firestore-save',
            message:
              error instanceof Error ? error.message : 'Firestore保存に失敗',
            timestamp: new Date(),
          });
        }

        // 用語履歴を更新
        try {
          await this.updateTermsHistory(result.terms!);
          result.historyUpdated = true;
          console.log('[TermsBatchService] Terms history updated');
        } catch (error) {
          errors.push({
            type: 'history-update',
            message:
              error instanceof Error ? error.message : '用語履歴の更新に失敗',
            timestamp: new Date(),
          });
        }

        // メタデータ更新
        try {
          await this.updateMetadata();
          result.metadataUpdated = true;
          console.log('[TermsBatchService] Metadata updated');
        } catch (error) {
          errors.push({
            type: 'metadata-update',
            message:
              error instanceof Error
                ? error.message
                : 'メタデータ更新に失敗',
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
          message:
            error instanceof Error ? error.message : '予期しないエラーが発生',
          timestamp: new Date(),
        });
      }
    }

    // 処理時間を計算
    result.processingTimeMs = Date.now() - startTime;
    result.errors = errors;

    // 処理完了ログ
    console.log(
      `[TermsBatchService] Batch completed in ${result.processingTimeMs}ms. Success: ${result.success}, PartialSuccess: ${result.partialSuccess}`
    );

    return result;
  }

  /**
   * タイムアウト制御付きでメイン処理を実行
   *
   * @param errors - エラー情報を格納する配列
   * @returns 処理結果
   */
  private async executeWithTimeout(
    errors: BatchErrorInfo[]
  ): Promise<{ terms: Term[] }> {
    return new Promise((resolve, reject) => {
      // タイムアウトタイマー
      const timeoutId = setTimeout(() => {
        reject(new Error('Batch processing timeout'));
      }, this.timeoutMs);

      // メイン処理
      this.executeMainProcess(errors)
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
   * Requirements 4.1: 1日3つ投資用語生成
   * Requirements 4.4: 初級〜上級難易度混在
   *
   * @param errors - エラー情報を格納する配列
   * @returns 処理結果
   */
  private async executeMainProcess(
    errors: BatchErrorInfo[]
  ): Promise<{ terms: Term[] }> {
    const terms: Term[] = [];
    const excludeTerms: string[] = [];

    // 各難易度で用語を順次生成
    for (const difficulty of DIFFICULTY_ORDER) {
      try {
        const options: GenerateTermOptions = {
          difficulty,
          excludeTerms: [...excludeTerms],
        };

        const result = await this.generationService.generateTerm(options);
        terms.push(result.term);

        // 次の生成で除外するために追加
        excludeTerms.push(result.term.name);

        console.log(
          `[TermsBatchService] Generated term: ${result.term.name} (${difficulty})`
        );
      } catch (error) {
        errors.push({
          type: `term-generation-${difficulty}`,
          message:
            error instanceof Error
              ? error.message
              : `${difficulty}用語の生成に失敗`,
          timestamp: new Date(),
        });
      }
    }

    return { terms };
  }

  /**
   * 用語をFirestoreに保存
   *
   * Requirements 4.5: 用語データFirestore保存
   *
   * @param date - ドキュメントID(YYYY-MM-DD形式)
   * @param terms - 保存する用語配列
   */
  private async saveTerms(date: string, terms: Term[]): Promise<void> {
    const db = getFirestore();

    // 用語ドキュメントを作成
    const termsDoc = createTermsDocument(date, terms);

    // Firestoreに保存
    await db.collection('terms').doc(date).set(termsDoc);
  }

  /**
   * 用語履歴を更新
   *
   * Requirements 4.6: 全履歴保持(重複チェック用)
   *
   * @param terms - 追加する用語配列
   */
  private async updateTermsHistory(terms: Term[]): Promise<void> {
    const db = getFirestore();
    const batch = db.batch();

    // 各用語を履歴に追加
    for (const term of terms) {
      const historyDoc = createTermHistoryDocument(term.name, term.difficulty);
      const docRef = db.collection('terms_history').doc();
      batch.set(docRef, historyDoc);
    }

    // バッチ書き込みをコミット
    await batch.commit();
  }

  /**
   * メタデータを更新
   *
   * バッチ完了時にmetadata/batch.termsLastUpdatedを更新
   */
  private async updateMetadata(): Promise<void> {
    const db = getFirestore();

    await db
      .collection(METADATA_COLLECTION)
      .doc(BATCH_METADATA_DOC_ID)
      .set(
        {
          termsLastUpdated: Timestamp.now(),
        },
        { merge: true }
      );
  }

  /**
   * 今日の日付をYYYY-MM-DD形式で取得
   *
   * @returns 日付文字列
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }
}
