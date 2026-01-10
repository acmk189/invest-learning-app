# Research & Design Decisions

## Summary
- **Feature**: migration-to-supabase
- **Discovery Scope**: Complex Integration(Firebase → Supabase完全移行)
- **Key Findings**:
  - @supabase/supabase-js v2.90.1 が最新版、Node.js 20+必須
  - RLSはパフォーマンスを考慮してインデックス付与が重要
  - React Native + AsyncStorageによるオフライン対応には既知の問題あり(セッション復元)

## Research Log

### Supabase JavaScript Client調査
- **Context**: バックエンド/フロントエンド共通で使用するSupabaseクライアントの最新情報確認
- **Sources Consulted**:
  - [GitHub - supabase/supabase-js](https://github.com/supabase/supabase-js)
  - [@supabase/supabase-js - npm](https://www.npmjs.com/package/@supabase/supabase-js)
  - [Supabase JS v2 Released](https://supabase.com/blog/supabase-js-v2-released)
- **Findings**:
  - 最新バージョン: v2.90.1
  - Node.js 18は2025年4月30日でEOL、v2.79.0以降はNode.js 20+必須
  - 型サポート強化、非同期認証メソッド、改善されたエラーハンドリング
  - CDN、npm、JSR(Deno)での提供
- **Implications**:
  - backend/package.jsonのNode.jsバージョン確認が必要
  - TypeScript型安全性が向上するため、モデル定義の移行がスムーズ

### Row Level Security (RLS) 設計
- **Context**: 読み取り全員許可、書き込みサービスロールのみの要件に対するRLS設計
- **Sources Consulted**:
  - [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
  - [RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
  - [Securing your API | Supabase Docs](https://supabase.com/docs/guides/api/securing-your-api)
- **Findings**:
  - RLS有効化後、ポリシーなしではanonキーでデータアクセス不可
  - パフォーマンス最適化: `auth.uid() = user_id`のようなRLSにはインデックス必須(100倍改善実績)
  - `FOR ALL`ではなく、SELECT/INSERT/UPDATE/DELETE個別ポリシー推奨
  - service_roleキーはRLSをバイパスする
- **Implications**:
  - news, terms, terms_history, batch_metadataテーブルにSELECTポリシー(全員許可)を設定
  - バッチ処理はservice_roleキーを使用するためRLSをバイパス
  - date列へのインデックス追加でクエリパフォーマンス最適化

### React Native + Expo + Supabase統合
- **Context**: モバイルアプリでのSupabase利用とオフライン対応方法の調査
- **Sources Consulted**:
  - [Use Supabase with Expo React Native | Supabase Docs](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
  - [Using Supabase - Expo Documentation](https://docs.expo.dev/guides/using-supabase/)
  - [Local-first architecture with Expo](https://docs.expo.dev/guides/local-first/)
  - [GitHub Discussion #36906 - Session lost when starting app offline](https://github.com/orgs/supabase/discussions/36906)
- **Findings**:
  - 必須パッケージ: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`
  - expo-sqlite/localStorageの利用が推奨される場合もあり
  - オフライン起動時にセッション消失する既知の問題あり(startAutoRefreshが原因)
  - WatermelonDB + Supabaseの組み合わせで完全オフラインファーストも可能
- **Implications**:
  - 本プロジェクトでは認証不要のため、セッション問題は影響なし
  - AsyncStorageベースのキャッシュ実装で十分対応可能
  - オフライン時はキャッシュ優先、オンライン復帰時にメタデータでチェック

### 既存コードベースFirebase依存分析
- **Context**: 移行対象ファイルと影響範囲の特定
- **Sources Consulted**: プロジェクト内部コード分析
- **Findings**:
  - バックエンド依存ファイル: 32ファイル(config, models, services, tests)
  - 主要依存: `firebase-admin`, `Timestamp` from `firebase-admin/firestore`
  - `getFirestore()` 呼び出し箇所: newsBatchService.ts, termsBatchService.ts
  - テストファイルも多数Firebase依存あり
- **Implications**:
  - Repository層パターンでのラップによる段階的移行が最適
  - Timestamp → Date型への変換が必要
  - テストはモック化されているため、インターフェース維持で移行容易

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 直接置換 | FirestoreをSupabaseに直接置換 | シンプル、変更箇所明確 | 一斉切り替えのリスク | 現行アーキテクチャとの整合性高い |
| Repository抽象化 | DB操作をRepository層で抽象化 | 将来の柔軟性、テスト容易 | 実装コスト増 | 既存パターンを踏襲 |
| Adapter Pattern | Firebase/Supabase両対応Adapter | 段階的移行、ロールバック可能 | 複雑性増大 | 移行期間中のみ有用 |

**選択**: 直接置換(Repository層維持)
- 既存コードは既にサービス層でのモジュール分離ができている
- フロントエンドは既存Repositoryパターンを維持
- 移行期間が短いためAdapter不要

## Design Decisions

### Decision: データベーステーブル設計
- **Context**: Firestore NoSQL構造からPostgreSQL RDB構造への変換
- **Alternatives Considered**:
  1. JSON型カラムでFirestore構造を維持
  2. 正規化した個別テーブル設計
- **Selected Approach**: 正規化した個別テーブル設計
- **Rationale**:
  - PostgreSQLの利点(インデックス、制約、クエリ最適化)を活かせる
  - 将来の拡張性(JOINクエリ、集計)が高い
- **Trade-offs**:
  - 移行スクリプトでのデータ変換が必要
  - クエリ構造の変更が必要
- **Follow-up**: termsテーブルの正規化レベル(1日3用語を個別行 vs 配列)の最終決定

### Decision: オフラインキャッシュ戦略
- **Context**: Firestoreのオフライン永続化に代わる仕組みの設計
- **Alternatives Considered**:
  1. WatermelonDB + Supabase(完全オフラインファースト)
  2. AsyncStorage + カスタムキャッシュ実装
  3. expo-sqlite + ローカルDB
- **Selected Approach**: AsyncStorage + カスタムキャッシュ実装
- **Rationale**:
  - 既存のcache-manager.tsを拡張可能
  - 認証不要のシンプルなデータ(ニュース、用語)に適切
  - 実装コストが低い
- **Trade-offs**:
  - WatermelonDBほどの堅牢性はない
  - 大量データには不向き(現状は問題なし)
- **Follow-up**: キャッシュ有効期限とメタデータチェック頻度の調整

### Decision: 環境変数管理
- **Context**: Supabase認証情報の安全な管理
- **Selected Approach**:
  - バックエンド: Vercel環境変数(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  - フロントエンド: Expo環境変数(SUPABASE_URL, SUPABASE_ANON_KEY)
- **Rationale**: 既存のFirebase環境変数管理と同じパターン
- **Trade-offs**: anon keyはクライアントに公開される(RLSで保護)

## Risks & Mitigations
- **リスク1**: オフライン起動時のデータ表示遅延
  - 緩和策: キャッシュファースト戦略、メタデータによる差分チェック
- **リスク2**: Supabase無料プラン制限(500MB、2GB帯域/月)
  - 緩和策: クエリ最適化、不要なフィールド取得を回避、キャッシュ活用
- **リスク3**: Firebase依存の完全削除漏れ
  - 緩和策: grep検索で依存チェック、ビルドテストで確認
- **リスク4**: データ移行時の整合性問題
  - 緩和策: 移行スクリプトでのバリデーション、ロールバック手順の準備

### Supabase CLI ローカル開発環境
- **Context**: Docker上でローカルSupabaseを立ち上げ、開発時に使用する構成の調査
- **Sources Consulted**:
  - [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started)
  - [Local Development & CLI | Supabase Docs](https://supabase.com/docs/guides/local-development)
  - [CLI Reference - supabase start](https://supabase.com/docs/reference/cli/start)
- **Findings**:
  - `supabase init` で `supabase/config.toml` を生成
  - `supabase start` でDocker経由でローカルスタック起動(PostgreSQL、Auth、Storage等)
  - 初回起動時にDockerイメージダウンロード(時間がかかる)
  - ローカル認証情報(URL、anon key、service_role key)が起動時に表示される
  - `supabase stop` で停止、`--no-backup` で状態リセット
  - `supabase db reset` でマイグレーション再適用
- **Implications**:
  - Supabase CLIをプロジェクトに導入
  - `supabase/migrations/` にDDLを配置してバージョン管理
  - Makefileでコマンドを集約(start, stop, reset, migrate等)
  - 環境変数でlocal/productionを切り替え

### Decision: ローカル開発環境構成
- **Context**: 開発時はDockerローカルSupabase、本番はSupabase Cloudを使用
- **Alternatives Considered**:
  1. docker-compose.ymlを自前で構成
  2. Supabase CLI(公式推奨)を使用
- **Selected Approach**: Supabase CLI を使用
- **Rationale**:
  - 公式サポートで安定性が高い
  - マイグレーション管理、シード、差分ツールが統合
  - `supabase/config.toml` で設定管理
- **Trade-offs**:
  - Supabase CLI のインストールが必要
  - Dockerが必須(開発者環境に依存)
- **Follow-up**: CI/CDでのマイグレーション適用フローの設計

## References
- [@supabase/supabase-js - npm](https://www.npmjs.com/package/@supabase/supabase-js) — 最新バージョン情報
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS設計ガイド
- [Use Supabase with Expo React Native](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — Expo統合ガイド
- [RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — パフォーマンス最適化
- [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started) — ローカル開発環境セットアップ
- [Local Development & CLI](https://supabase.com/docs/guides/local-development) — ローカル開発ガイド
