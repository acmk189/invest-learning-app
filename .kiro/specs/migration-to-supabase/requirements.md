# Requirements Document

## Project Description (Input)
Firebase Firestore から Supabase(PostgreSQL)へのデータベース移行

## 1. 概要

### 1.1 移行の背景
React Native(Expo Dev Client)とFirebaseの相性問題により、iOSアプリのビルドが失敗する。この問題を解決するため、データベースをFirebase FirestoreからSupabase(PostgreSQL)に移行する。

### 1.2 移行スコープ

| 対象 | 移行前 | 移行後 |
|------|--------|--------|
| バックエンドDB接続 | firebase-admin SDK | @supabase/supabase-js (Node.js) |
| フロントエンドDB接続 | @react-native-firebase/firestore | @supabase/supabase-js |
| データベース | Firebase Firestore (NoSQL) | Supabase PostgreSQL (RDB) |
| オフライン永続化 | Firestore組み込み機能 | AsyncStorage + カスタム実装 |

### 1.3 移行対象外
- AI処理(Claude API)
- ニュース取得(NewsAPI, Google News RSS)
- Vercel Cron Jobs(エンドポイントURLは維持)
- UIコンポーネント(Repository層以下のみ変更)

---

## 2. Requirements

### Requirement 1: Supabaseプロジェクト設定

**Objective:** As a 開発者, I want Supabaseプロジェクトを設定する, so that データベース移行の基盤を構築できる

#### Acceptance Criteria
- [ ] AC1: Supabaseプロジェクトを作成し、PostgreSQLデータベースを有効化する
- [ ] AC2: プロジェクトURLとAPIキー(anon key, service_role key)を取得する
- [ ] AC3: 環境変数(SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)を設定する
- [ ] AC4: Row Level Security (RLS) ポリシーを設計する(読み取り: 全員許可、書き込み: サービスロールのみ)

---

### Requirement 2: データベーススキーマ設計

**Objective:** As a 開発者, I want PostgreSQLスキーマを設計する, so that Firestoreのデータを正規化して保存できる

#### Acceptance Criteria
- [ ] AC1: `news`テーブルを作成する(date: DATE PRIMARY KEY, world_news_title, world_news_summary, japan_news_title, japan_news_summary, created_at, updated_at)
- [ ] AC2: `terms`テーブルを作成する(id: SERIAL PRIMARY KEY, date: DATE, name, description, difficulty, created_at)
- [ ] AC3: `terms_history`テーブルを作成する(id: SERIAL PRIMARY KEY, term_name, delivered_at, difficulty)
- [ ] AC4: `batch_metadata`テーブルを作成する(id: INTEGER PRIMARY KEY DEFAULT 1, news_last_updated, terms_last_updated)
- [ ] AC5: 日付カラムにインデックスを作成し、クエリパフォーマンスを最適化する
- [ ] AC6: CHECK制約で difficulty の値を制限する('beginner', 'intermediate', 'advanced')

---

### Requirement 3: バックエンドSupabaseクライアント実装

**Objective:** As a 開発者, I want バックエンドにSupabaseクライアントを導入する, so that バッチ処理でSupabaseにデータを保存できる

#### Acceptance Criteria
- [ ] AC1: `@supabase/supabase-js`をbackendにインストールする
- [ ] AC2: `backend/src/config/supabase.ts`にSupabaseクライアント初期化コードを実装する
- [ ] AC3: service_role keyを使用してサーバーサイド認証を設定する
- [ ] AC4: 接続テスト用のヘルスチェック機能を実装する

---

### Requirement 4: バックエンドデータモデル移行

**Objective:** As a 開発者, I want データモデルをSupabase用に変換する, so that PostgreSQLに適したデータ構造で保存できる

#### Acceptance Criteria
- [ ] AC1: `backend/src/models/`のモデルをSupabase用に更新する
- [ ] AC2: Timestamp型をISO 8601文字列またはDate型に変更する
- [ ] AC3: 新しいモデル用のバリデーション関数を実装する
- [ ] AC4: 既存のバリデーションロジック(文字数制限等)を維持する

---

### Requirement 5: ニュースバッチ処理移行

**Objective:** As a 開発者, I want ニュースバッチ処理をSupabase対応にする, so that ニュースデータをSupabaseに保存できる

#### Acceptance Criteria
- [ ] AC1: `newsBatchService.ts`のFirestore書き込みをSupabase upsertに変更する
- [ ] AC2: `batch_metadata`テーブルの`news_last_updated`を更新する処理を実装する
- [ ] AC3: エラーハンドリングをSupabase用に更新する
- [ ] AC4: リトライロジックを維持する
- [ ] AC5: 既存のテストをSupabase用に更新する

---

### Requirement 6: 用語バッチ処理移行

**Objective:** As a 開発者, I want 用語バッチ処理をSupabase対応にする, so that 用語データをSupabaseに保存できる

#### Acceptance Criteria
- [ ] AC1: `termsBatchService.ts`のFirestore書き込みをSupabase insertに変更する
- [ ] AC2: `terms_history`テーブルへの履歴保存を実装する
- [ ] AC3: `batch_metadata`テーブルの`terms_last_updated`を更新する処理を実装する
- [ ] AC4: エラーハンドリングをSupabase用に更新する
- [ ] AC5: 既存のテストをSupabase用に更新する

---

### Requirement 7: フロントエンドSupabaseクライアント実装

**Objective:** As a 開発者, I want フロントエンドにSupabaseクライアントを導入する, so that React NativeアプリからSupabaseにアクセスできる

#### Acceptance Criteria
- [ ] AC1: `@supabase/supabase-js`をmobileにインストールする
- [ ] AC2: `mobile/src/supabase/client.ts`にSupabaseクライアント初期化コードを実装する
- [ ] AC3: anon keyを使用してクライアントサイド認証を設定する
- [ ] AC4: 接続テスト機能を実装する

---

### Requirement 8: フロントエンドクエリ実装

**Objective:** As a 開発者, I want Supabase用のクエリを実装する, so that ニュース・用語データを取得できる

#### Acceptance Criteria
- [ ] AC1: `mobile/src/supabase/queries.ts`に今日のニュース取得クエリを実装する
- [ ] AC2: 今日の用語取得クエリを実装する
- [ ] AC3: バッチメタデータ取得クエリを実装する
- [ ] AC4: クエリ結果の型定義を作成する
- [ ] AC5: エラーハンドリングを実装する

---

### Requirement 9: フロントエンドRepository移行

**Objective:** As a 開発者, I want RepositoryをSupabase対応にする, so that 既存のViewModel/Viewを変更せずにデータ取得できる

#### Acceptance Criteria
- [ ] AC1: `NewsRepository`のFirestore依存をSupabaseに変更する
- [ ] AC2: `TermsRepository`のFirestore依存をSupabaseに変更する
- [ ] AC3: キャッシュマネージャーとの統合を維持する
- [ ] AC4: エラー型をSupabase用に更新する
- [ ] AC5: 既存のインターフェース(NewsResult, TermsResult)を維持する

---

### Requirement 10: オフライン対応強化

**Objective:** As a ユーザー, I want オフラインでもアプリを利用する, so that ネットワーク接続なしでニュース・用語を閲覧できる

#### Acceptance Criteria
- [ ] AC1: AsyncStorageベースのキャッシュを拡張し、Supabaseデータをキャッシュする
- [ ] AC2: ネットワーク状態の検出機能を実装する
- [ ] AC3: オフライン時はキャッシュからデータを取得する
- [ ] AC4: オンライン復帰時にメタデータをチェックし、必要に応じてデータを更新する
- [ ] AC5: キャッシュ済みデータを1秒以内に表示する

---

### Requirement 11: Firebase依存の完全削除

**Objective:** As a 開発者, I want Firebase依存を完全に削除する, so that ビルド問題を解決できる

#### Acceptance Criteria
- [ ] AC1: `@react-native-firebase/*`パッケージをアンインストールする
- [ ] AC2: `firebase-admin`パッケージをアンインストールする
- [ ] AC3: Firebase設定ファイル(GoogleService-Info.plist等)を削除する
- [ ] AC4: Firebase関連のコード・型定義を削除する
- [ ] AC5: Expoビルドが成功することを確認する

---

### Requirement 12: データ移行

**Objective:** As a 開発者, I want 既存データをSupabaseに移行する, so that 本番環境でサービスを継続できる

#### Acceptance Criteria
- [ ] AC1: Firestoreからデータをエクスポートするスクリプトを作成する
- [ ] AC2: エクスポートしたデータをSupabase用に変換する
- [ ] AC3: Supabaseにデータをインポートする
- [ ] AC4: データの整合性を検証する

---

### Requirement 13: 環境変数管理

**Objective:** As a 開発者, I want 環境変数を適切に管理する, so that APIキーを安全に扱える

#### Acceptance Criteria
- [ ] AC1: Vercel環境変数にSupabase認証情報を追加する
- [ ] AC2: ローカル開発用の`.env.local`を更新する
- [ ] AC3: `.env.example`にSupabase用の環境変数テンプレートを追加する
- [ ] AC4: Firebase環境変数を削除する

---

### Requirement 14: テスト・検証

**Objective:** As a 開発者, I want 移行後のシステムをテストする, so that 正常動作を確認できる

#### Acceptance Criteria
- [ ] AC1: バックエンドのユニットテストをSupabase用に更新する
- [ ] AC2: フロントエンドのユニットテストをSupabase用に更新する
- [ ] AC3: バッチ処理の統合テストを実施する
- [ ] AC4: オフライン動作の検証を実施する
- [ ] AC5: iOSビルドが成功することを確認する
- [ ] AC6: 本番環境でのE2Eテストを実施する

---

### Requirement 15: ローカル開発環境構築

**Objective:** As a 開発者, I want DockerでローカルSupabase環境を構築する, so that 本番環境に影響を与えずに開発・テストできる

#### Acceptance Criteria
- [ ] AC1: Supabase CLIをプロジェクトに導入し、`supabase init`で初期化する
- [ ] AC2: `supabase/migrations/`にDDLマイグレーションファイルを配置する
- [ ] AC3: `make supabase-start`でローカルSupabaseを起動できる
- [ ] AC4: 環境変数でローカル/本番を切り替える仕組みを実装する
- [ ] AC5: Makefileに開発・デプロイコマンドを集約する

---

## 3. 非機能要件

### 3.1 パフォーマンス要件
- オフライン時のキャッシュデータ表示は1秒以内
- バッチ処理の成功率98%以上を維持

### 3.2 コスト要件
- Supabase無料プランの制限(500MB、2GB帯域/月)を遵守する
- 月間運用コスト1,000円以下を維持する

### 3.3 運用要件
- 移行中のサービス停止を最小化する
- 既存のAPIエンドポイント(/api/batch/news, /api/batch/terms)のURLを維持する
- 既存のCron設定(毎日8:00 JST)を維持する

---

## 4. 前提条件

以下のタスクは移行前に完了している前提とする：
- Task 24.1-24.3: Terms UI最適化
- Task 25.1: Expo Router初期読み込み最適化
- Task 27.1-27.2: バッチ並列/Claude最適化
- Task 30.1, 31.1, 31.3: セキュリティ基盤

---

## 5. 成功基準

1. Expo Dev Clientでのビルドが成功する
2. 全てのユニットテストがパスする
3. バッチ処理が正常に動作する(98%以上の成功率)
4. オフライン時にキャッシュデータを1秒以内に表示する
5. 既存機能が全て正常に動作する

---

## 6. 現行システム分析

### 6.1 Firestoreコレクション構成

#### news コレクション
```
news/{YYYY-MM-DD}
├── date: string           # ドキュメントID(YYYY-MM-DD)
├── worldNews
│   ├── title: string
│   ├── summary: string    # 約2000文字
│   └── updatedAt: Timestamp
├── japanNews
│   ├── title: string
│   ├── summary: string    # 約2000文字
│   └── updatedAt: Timestamp
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

#### terms コレクション
```
terms/{YYYY-MM-DD}
├── date: string           # ドキュメントID(YYYY-MM-DD)
├── terms: Array<Term>     # 3つの用語
│   └── Term
│       ├── name: string
│       ├── description: string  # 約500文字
│       └── difficulty: 'beginner' | 'intermediate' | 'advanced'
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

#### terms_history コレクション
```
terms_history/{auto-id}
├── termName: string
├── deliveredAt: Timestamp
└── difficulty: string
```

#### metadata コレクション
```
metadata/batch
├── newsLastUpdated: Timestamp
└── termsLastUpdated: Timestamp
```

### 6.2 現行の依存関係

#### バックエンド(backend/)
| ファイル | Firebase依存 |
|----------|-------------|
| src/config/firebase.ts | firebase-admin初期化 |
| src/models/metadata.model.ts | Timestamp型使用 |
| src/services/news/batch/newsBatchService.ts | Firestore書き込み |
| src/services/terms/batch/termsBatchService.ts | Firestore書き込み |
| api/batch/news.ts | Firestore経由でデータ保存 |
| api/batch/terms.ts | Firestore経由でデータ保存 |

#### フロントエンド(mobile/)
| ファイル | Firebase依存 |
|----------|-------------|
| src/config/firebase.ts | Firebase初期化設定 |
| src/firestore/client.ts | @react-native-firebase/firestore |
| src/firestore/queries.ts | Firestoreクエリ |
| src/firestore/errors.ts | Firestoreエラー型 |
| src/firestore/types.ts | Firestore型定義 |
| src/news/news-repository.ts | Firestoreクエリ使用 |
| src/terms/terms-repository.ts | Firestoreクエリ使用 |
| src/cache/cache-manager.ts | メタデータ取得(間接依存) |
