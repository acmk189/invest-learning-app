/**
 * エラーロガー実装
 * Task 2.2: エラーハンドリング共通機能実装
 * Task 12: Firebase依存の完全削除 - Supabase対応
 */

import { SupabaseClient } from '@supabase/supabase-js';
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
  original_error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, any>;
  api_name?: string;
  status_code?: number;
  operation?: string;
}

/**
 * エラーログをSupabaseに記録するクラス
 */
export class ErrorLogger {
  private readonly supabase: SupabaseClient;
  private readonly tableName: string = 'error_logs';

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * エラーをSupabaseに記録する
   * @param error - 記録するエラー
   * @param context - 追加のコンテキスト情報(オプション)
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
        logData.original_error = {
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
        logData.api_name = (error as any).apiName;
      }
      if ('statusCode' in error) {
        logData.status_code = (error as any).statusCode;
      }

      // データベース エラーの場合、操作タイプを記録
      if ('operation' in error) {
        logData.operation = (error as any).operation;
      }

      // Supabaseに記録
      const { error: insertError } = await this.supabase
        .from(this.tableName)
        .insert(logData);

      if (insertError) {
        console.error('Failed to log error to Supabase:', insertError);
      }
    } catch (loggingError) {
      // エラーログの記録に失敗しても例外をスローしない
      // コンソールにエラーを出力
      console.error('Failed to log error to Supabase:', loggingError);
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
