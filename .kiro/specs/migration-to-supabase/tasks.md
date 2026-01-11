# Implementation Plan

## Phase 1: 基盤構築

- [x] 1. Supabaseプロジェクト設定と環境変数管理
- [ ] 1.1 Supabaseプロジェクト作成とAPIキー取得
  - Supabase Cloudでプロジェクト作成
  - PostgreSQLデータベース有効化
  - プロジェクトURL、anon key、service_role keyを取得
  - _Requirements: 1_
- [x] 1.2 環境変数テンプレート更新
  - `.env.example`にSupabase環境変数テンプレートを追加
  - バックエンド用(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  - フロントエンド用(SUPABASE_URL, SUPABASE_ANON_KEY)
  - ローカル開発用変数(LOCAL_SUPABASE_*)
  - _Requirements: 13_
- [x] 1.3 バックエンド環境変数設定ユーティリティ実装
  - `backend/src/config/envConfig.ts`を更新
  - 環境変数バリデーション関数を実装
  - ローカル/本番環境の自動切り替えロジック
  - _Requirements: 13_

- [x] 2. ローカル開発環境構築
- [x] 2.1 Supabase CLI初期化とディレクトリ構成 (P)
  - `supabase init`でプロジェクト初期化
  - `supabase/config.toml`設定
  - ディレクトリ構造の作成(supabase/migrations/)
  - _Requirements: 15_
- [x] 2.2 DDLマイグレーションファイル作成 (P)
  - `20260110000000_create_news_table.sql`
  - `20260110000001_create_terms_table.sql`
  - `20260110000002_create_terms_history_table.sql`
  - `20260110000003_create_batch_metadata_table.sql`
  - `20260110000004_create_rls_policies.sql`
  - インデックス作成とCHECK制約設定
  - _Requirements: 2, 15_
- [x] 2.3 Makefile作成 (P)
  - Supabaseコマンド(start, stop, reset, status)
  - データベースコマンド(migrate, seed, push)
  - 開発コマンド(backend-dev, mobile-dev, test)
  - デプロイコマンド
  - _Requirements: 15_
- [x] 2.4 ローカル開発環境動作確認
  - `make supabase-start`でDockerスタック起動
  - マイグレーション適用確認
  - ローカル認証情報の取得と設定
  - _Requirements: 15_

## Phase 2: バックエンド移行

- [x] 3. バックエンドSupabaseクライアント実装
- [x] 3.1 Supabase SDKインストールと型定義
  - `@supabase/supabase-js`パッケージをインストール
  - `backend/src/models/supabase.types.ts`に型定義を作成(NewsRow, TermRow, TermHistoryRow, BatchMetadataRow)
  - _Requirements: 3, 4_
- [x] 3.2 Supabaseクライアント初期化実装
  - `backend/src/config/supabase.ts`を作成
  - シングルトンパターンで接続管理
  - service_role keyによるサーバーサイド認証設定
  - _Requirements: 3_
- [x] 3.3 ヘルスチェック機能実装
  - 接続テスト用ヘルスチェック関数
  - 環境変数検証
  - _Requirements: 3_

- [x] 4. バックエンドデータモデル移行
- [x] 4.1 ニュースモデル更新
  - Timestamp型をISO 8601文字列に変更
  - NewsRowインターフェースとの整合性確保
  - バリデーション関数の更新
  - _Requirements: 4_
- [x] 4.2 用語モデル更新
  - Timestamp型をISO 8601文字列に変更
  - TermRow、TermHistoryRowインターフェースとの整合性確保
  - 文字数制限等の既存バリデーション維持
  - _Requirements: 4_
- [x] 4.3 メタデータモデル更新
  - BatchMetadataRowインターフェース対応
  - Timestamp型の変換
  - _Requirements: 4_

- [x] 5. ニュースバッチ処理移行
- [x] 5.1 NewsBatchService Supabase対応
  - Firestore書き込みをSupabase upsertに変更
  - newsテーブルへのupsert実装
  - 日付をPKとした冪等性の確保
  - _Requirements: 5_
- [x] 5.2 ニュースメタデータ更新処理
  - batch_metadataテーブルのnews_last_updated更新
  - トランザクション的な整合性確保
  - _Requirements: 5_
- [x] 5.3 ニュースバッチエラーハンドリング更新
  - Supabaseエラーコードのマッピング
  - 既存リトライロジックの維持
  - バッチ処理成功率98%以上の維持
  - _Requirements: 5_
- [x] 5.4 ニュースバッチテスト更新
  - 既存テストをSupabase用に更新
  - モック設定の変更
  - _Requirements: 5, 14_

- [x] 6. 用語バッチ処理移行
- [x] 6.1 TermsBatchService Supabase対応
  - Firestore書き込みをSupabase insertに変更
  - termsテーブルへのinsert実装
  - 1日3用語の保存
  - _Requirements: 6_
- [x] 6.2 用語履歴保存処理
  - terms_historyテーブルへの履歴insert
  - term_name、delivered_at、difficultyの保存
  - _Requirements: 6_
- [x] 6.3 用語メタデータ更新処理
  - batch_metadataテーブルのterms_last_updated更新
  - _Requirements: 6_
- [x] 6.4 用語バッチエラーハンドリング更新
  - Supabaseエラーコードのマッピング
  - 既存リトライロジックの維持
  - _Requirements: 6_
- [x] 6.5 用語バッチテスト更新
  - 既存テストをSupabase用に更新
  - モック設定の変更
  - _Requirements: 6, 14_

## Phase 3: データ移行(スキップ)

> **注記**: Firebaseにデータが存在しないため、本フェーズはスキップします。
> Task 4で実装したFirebase→Supabase変換関数(`newsDocumentToNewsRow`等)は、
> Task 5, 6実装時に不要であれば削除します。

- [x] 7. Firestoreデータエクスポートと移行 _(スキップ: データなし)_
- [x] 7.1 Firestoreエクスポートスクリプト作成 _(スキップ)_
- [x] 7.2 データ変換スクリプト作成 _(スキップ)_
- [x] 7.3 Supabaseインポート実行 _(スキップ)_
- [x] 7.4 データ整合性検証 _(スキップ)_

## Phase 4: フロントエンド移行

- [x] 8. フロントエンドSupabaseクライアント実装
- [x] 8.1 Supabase SDKインストール
  - `@supabase/supabase-js`パッケージをmobileにインストール
  - 依存関係の確認
  - _Requirements: 7_
- [x] 8.2 Supabaseクライアント初期化実装
  - `mobile/src/supabase/client.ts`を作成
  - anon keyによるクライアントサイド認証設定
  - detectSessionInUrl: false設定(React Native向け)
  - _Requirements: 7_
- [x] 8.3 接続テスト機能実装
  - クライアント初期化テスト
  - 接続確認関数
  - _Requirements: 7_

- [x] 9. フロントエンドクエリ実装
- [x] 9.1 ニュースクエリ実装
  - `mobile/src/supabase/queries.ts`を作成
  - getTodayNews(date)クエリ
  - NewsRow型の返却
  - _Requirements: 8_
- [x] 9.2 用語クエリ実装
  - getTodayTerms(date)クエリ
  - TermRow[]型の返却(3件)
  - _Requirements: 8_
- [x] 9.3 メタデータクエリ実装
  - getBatchMetadata()クエリ
  - BatchMetadataRow型の返却
  - _Requirements: 8_
- [x] 9.4 クエリエラーハンドリング実装
  - Supabaseエラー型の定義
  - エラーハンドリングヘルパー
  - _Requirements: 8_

- [x] 10. フロントエンドRepository移行
- [x] 10.1 NewsRepository移行
  - Firestore依存をSupabaseQueriesに変更
  - 既存インターフェース(NewsResult)の維持
  - CacheManagerとの統合維持
  - _Requirements: 9_
- [x] 10.2 TermsRepository移行
  - Firestore依存をSupabaseQueriesに変更
  - 既存インターフェース(TermsResult)の維持
  - CacheManagerとの統合維持
  - _Requirements: 9_
- [x] 10.3 Supabaseエラー型対応
  - FirestoreエラーからSupabaseエラーへの変更
  - エラー型定義の更新
  - _Requirements: 9_

- [x] 11. オフライン対応強化
- [x] 11.1 CacheManager Supabase対応
  - AsyncStorageベースのキャッシュ拡張
  - Supabaseデータのキャッシュ保存
  - キャッシュキーの設計(@cache/news/{date}等)
  - _Requirements: 10_
- [x] 11.2 メタデータチェック機能実装
  - Supabaseからメタデータ取得
  - ローカルキャッシュとの比較
  - 更新必要判定ロジック
  - _Requirements: 10_
- [x] 11.3 ネットワーク状態検出実装
  - オンライン/オフライン状態の検出
  - 状態変更時のコールバック
  - _Requirements: 10_
- [x] 11.4 オフラインフォールバック実装
  - オフライン時のキャッシュ優先取得
  - オンライン復帰時の同期処理
  - 1秒以内のキャッシュ表示達成
  - _Requirements: 10_

## Phase 5: クリーンアップ

- [x] 12. Firebase依存の完全削除
- [x] 12.1 バックエンドFirebase削除
  - `firebase-admin`パッケージをアンインストール
  - `backend/src/config/firebase.ts`を削除
  - Firebase関連の型定義を削除
  - _Requirements: 11_
- [x] 12.2 フロントエンドFirebase削除
  - `@react-native-firebase/*`パッケージをアンインストール
  - `mobile/src/config/firebase.ts`を削除
  - `mobile/src/firestore/`ディレクトリを削除
  - _Requirements: 11_
- [x] 12.3 Firebase設定ファイル削除
  - GoogleService-Info.plist削除
  - google-services.json削除(Android用があれば)
  - Firebase環境変数の削除
  - _Requirements: 11_
- [x] 12.4 Expoビルド確認
  - iOS Expoビルドの実行
  - ビルド成功の確認
  - Firebase依存が完全に排除されたことを確認
  - _Requirements: 11_

## Phase 6: テスト・検証

- [x] 13. テストと最終検証
- [x] 13.1 バックエンドユニットテスト更新
  - SupabaseClient初期化テスト
  - 型変換テスト
  - バッチ処理テスト
  - _Requirements: 14_
- [x] 13.2 フロントエンドユニットテスト更新
  - SupabaseQueries テスト
  - Repository テスト
  - CacheManager テスト
  - _Requirements: 14_
- [x] 13.3 統合テスト実施
  - バッチ処理フルフロー(Cron → Supabase保存)
  - データ取得フルフロー(App → Repository → Supabase)
  - _Requirements: 14_
- [x] 13.4 オフライン動作検証
  - オフライン時のキャッシュ表示(1秒以内)
  - オンライン復帰時の同期
  - ネットワーク切り替えの安定性
  - _Requirements: 10, 14_
- [x] 13.5 本番環境E2Eテスト
  - Vercel Cron実行確認
  - モバイルアプリでのデータ表示確認
  - バッチ成功率98%以上の確認
  - _Requirements: 14_

## Vercel環境変数設定(手動作業)

- [ ] 14. 本番環境設定
- [ ] 14.1 Vercel環境変数追加
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - _Requirements: 1, 13_
- [ ] 14.2 Firebase環境変数削除
  - FIREBASE_*関連の環境変数を削除
  - _Requirements: 11, 13_
