/**
 * エラーロガー実装
 * Task 2.2: エラーハンドリング共通機能実装
 */

import * as admin from 'firebase-admin';
import { AppError } from './types';

/**
 * エラーログのデータ構造
 */
interface ErrorLogData {
  type: string;
  name: string;
  message: string;
  severity: string;
  retryable: boolean;
  timestamp: number;
  stack?: string;
  originalError?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, any>;
  [key: string]: any; // 追加のプロパティを許可
}

/**
 * エラーログをFirestoreに記録するクラス
 */
export class ErrorLogger {
  private readonly firestore: admin.firestore.Firestore;
  private readonly collectionName: string = 'error_logs';

  constructor(firestore: admin.firestore.Firestore) {
    this.firestore = firestore;
  }

  /**
   * エラーをFirestoreに記録する
   * @param error - 記録するエラー
   * @param context - 追加のコンテキスト情報（オプション）
   */
  async logError(error: AppError, context?: Record<string, any>): Promise<void> {
    try {
      const logData: ErrorLogData = {
        type: error.type,
        name: error.name,
        message: error.message,
        severity: error.severity,
        retryable: error.retryable,
        timestamp: error.timestamp,
        stack: error.stack,
      };

      // 元のエラー情報を追加
      if (error.originalError) {
        logData.originalError = {
          name: error.originalError.name,
          message: error.originalError.message,
          stack: error.originalError.stack,
        };
      }

      // コンテキスト情報を追加
      if (context) {
        logData.context = context;
      }

      // API エラーの場合、追加情報を記録
      if ('apiName' in error) {
        logData.apiName = (error as any).apiName;
      }
      if ('statusCode' in error) {
        logData.statusCode = (error as any).statusCode;
      }

      // Firestore エラーの場合、操作タイプを記録
      if ('operation' in error) {
        logData.operation = (error as any).operation;
      }

      // Firestoreに記録
      await this.firestore.collection(this.collectionName).add(logData);
    } catch (loggingError) {
      // エラーログの記録に失敗しても例外をスローしない
      // コンソールにエラーを出力
      console.error('Failed to log error to Firestore:', loggingError);
    }
  }

  /**
   * エラーとコンテキスト情報を一緒に記録する
   * @param error - 記録するエラー
   * @param context - コンテキスト情報
   */
  async logErrorWithContext(
    error: AppError,
    context: Record<string, any>
  ): Promise<void> {
    return this.logError(error, context);
  }
}
