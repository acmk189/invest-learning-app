# Firebase → Supabase 移行要件定義書

## 1. 概要

### 1.1 移行の背景

React Native（Expo Dev Client）とFirebaseの相性問題により、iOSアプリのビルドが失敗する。
この問題を解決するため、データベースをFirebase FirestoreからSupabase（PostgreSQL）に移行する。

### 1.2 移行のスコープ

| 対象 | 移行前 | 移行後 |
|------|--------|--------|
| バックエンドDB接続 | firebase-admin SDK | @supabase/supabase-js (Node.js) |
| フロントエンドDB接続 | @react-native-firebase/firestore | @supabase/supabase-js |
| データベース | Firebase Firestore (NoSQL) | Supabase PostgreSQL (RDB) |
| オフライン永続化 | Firestore組み込み機能 | AsyncStorage + カスタム実装 |

### 1.3 移行しないもの

- AI処理（Claude API）: 変更なし
- ニュース取得（NewsAPI, Google News RSS）: 変更なし
- Vercel Cron Jobs: 変更なし（エンドポイントURLは維持）
- UIコンポーネント: 変更なし（Repository層以下のみ変更）

---

## 2. 現行システム分析

### 2.1 Firestoreコレクション構成

#### news コレクション
```
news/{YYYY-MM-DD}
├── date: string           # ドキュメントID（YYYY-MM-DD）
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
├── date: string           # ドキュメントID（YYYY-MM-DD）
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

### 2.2 現行の依存関係

#### バックエンド（backend/）
| ファイル | Firebase依存 |
|----------|-------------|
| src/config/firebase.ts | firebase-admin初期化 |
| src/models/metadata.model.ts | Timestamp型使用 |
| src/services/news/batch/newsBatchService.ts | Firestore書き込み |
| src/services/terms/batch/termsBatchService.ts | Firestore書き込み |
| api/batch/news.ts | Firestore経由でデータ保存 |
| api/batch/terms.ts | Firestore経由でデータ保存 |

#### フロントエンド（mobile/）
| ファイル | Firebase依存 |
|----------|-------------|
| src/config/firebase.ts | Firebase初期化設定 |
| src/firestore/client.ts | @react-native-firebase/firestore |
| src/firestore/queries.ts | Firestoreクエリ |
| src/firestore/errors.ts | Firestoreエラー型 |
| src/firestore/types.ts | Firestore型定義 |
| src/news/news-repository.ts | Firestoreクエリ使用 |
| src/terms/terms-repository.ts | Firestoreクエリ使用 |
| src/cache/cache-manager.ts | メタデータ取得（間接依存） |

---

## 3. 移行要件

### Requirement M1: Supabaseプロジェクト設定

**Objective:** As a 開発者, I want Supabaseプロジェクトを設定する, so that データベース移行の基盤を構築できる

#### Acceptance Criteria

1. Supabaseプロジェクトを作成し、PostgreSQLデータベースを有効化する
2. プロジェクトURLとAPIキー（anon key, service_role key）を取得する
3. 環境変数（SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY）を設定する
4. Row Level Security (RLS) ポリシーを設計する（読み取り: 全員許可、書き込み: サービスロールのみ）

### Requirement M2: データベーススキーマ設計

**Objective:** As a 開発者, I want PostgreSQLスキーマを設計する, so that Firestoreのデータを正規化して保存できる

#### Acceptance Criteria

1. `news`テーブルを作成する（date: DATE PRIMARY KEY, world_news_title, world_news_summary, japan_news_title, japan_news_summary, created_at, updated_at）
2. `terms`テーブルを作成する（id: SERIAL PRIMARY KEY, date: DATE, name, description, difficulty, created_at）
3. `terms_history`テーブルを作成する（id: SERIAL PRIMARY KEY, term_name, delivered_at, difficulty）
4. `batch_metadata`テーブルを作成する（id: INTEGER PRIMARY KEY DEFAULT 1, news_last_updated, terms_last_updated）
5. 日付カラムにインデックスを作成し、クエリパフォーマンスを最適化する
6. CHECK制約で difficulty の値を制限する（'beginner', 'intermediate', 'advanced'）

### Requirement M3: バックエンドSupabaseクライアント実装

**Objective:** As a 開発者, I want バックエンドにSupabaseクライアントを導入する, so that バッチ処理でSupabaseにデータを保存できる

#### Acceptance Criteria

1. `@supabase/supabase-js`をbackendにインストールする
2. `backend/src/config/supabase.ts`にSupabaseクライアント初期化コードを実装する
3. service_role keyを使用してサーバーサイド認証を設定する
4. 接続テスト用のヘルスチェック機能を実装する

### Requirement M4: バックエンドデータモデル移行

**Objective:** As a 開発者, I want データモデルをSupabase用に変換する, so that PostgreSQLに適したデータ構造で保存できる

#### Acceptance Criteria

1. `backend/src/models/`のモデルをSupabase用に更新する
2. Timestamp型をISO 8601文字列またはDate型に変更する
3. 新しいモデル用のバリデーション関数を実装する
4. 既存のバリデーションロジック（文字数制限等）を維持する

### Requirement M5: ニュースバッチ処理移行

**Objective:** As a 開発者, I want ニュースバッチ処理をSupabase対応にする, so that ニュースデータをSupabaseに保存できる

#### Acceptance Criteria

1. `newsBatchService.ts`のFirestore書き込みをSupabase upsertに変更する
2. `batch_metadata`テーブルの`news_last_updated`を更新する処理を実装する
3. エラーハンドリングをSupabase用に更新する
4. リトライロジックを維持する
5. 既存のテストをSupabase用に更新する

### Requirement M6: 用語バッチ処理移行

**Objective:** As a 開発者, I want 用語バッチ処理をSupabase対応にする, so that 用語データをSupabaseに保存できる

#### Acceptance Criteria

1. `termsBatchService.ts`のFirestore書き込みをSupabase insertに変更する
2. `terms_history`テーブルへの履歴保存を実装する
3. `batch_metadata`テーブルの`terms_last_updated`を更新する処理を実装する
4. エラーハンドリングをSupabase用に更新する
5. 既存のテストをSupabase用に更新する

### Requirement M7: フロントエンドSupabaseクライアント実装

**Objective:** As a 開発者, I want フロントエンドにSupabaseクライアントを導入する, so that React NativeアプリからSupabaseにアクセスできる

#### Acceptance Criteria

1. `@supabase/supabase-js`をmobileにインストールする
2. `mobile/src/supabase/client.ts`にSupabaseクライアント初期化コードを実装する
3. anon keyを使用してクライアントサイド認証を設定する
4. 接続テスト機能を実装する

### Requirement M8: フロントエンドクエリ実装

**Objective:** As a 開発者, I want Supabase用のクエリを実装する, so that ニュース・用語データを取得できる

#### Acceptance Criteria

1. `mobile/src/supabase/queries.ts`に今日のニュース取得クエリを実装する
2. 今日の用語取得クエリを実装する
3. バッチメタデータ取得クエリを実装する
4. クエリ結果の型定義を作成する
5. エラーハンドリングを実装する

### Requirement M9: フロントエンドRepository移行

**Objective:** As a 開発者, I want RepositoryをSupabase対応にする, so that 既存のViewModel/Viewを変更せずにデータ取得できる

#### Acceptance Criteria

1. `NewsRepository`のFirestore依存をSupabaseに変更する
2. `TermsRepository`のFirestore依存をSupabaseに変更する
3. キャッシュマネージャーとの統合を維持する
4. エラー型をSupabase用に更新する
5. 既存のインターフェース（NewsResult, TermsResult）を維持する

### Requirement M10: オフライン対応強化

**Objective:** As a ユーザー, I want オフラインでもアプリを利用する, so that ネットワーク接続なしでニュース・用語を閲覧できる

#### Acceptance Criteria

1. AsyncStorageベースのキャッシュを拡張し、Supabaseデータをキャッシュする
2. ネットワーク状態の検出機能を実装する
3. オフライン時はキャッシュからデータを取得する
4. オンライン復帰時にメタデータをチェックし、必要に応じてデータを更新する
5. キャッシュ済みデータを1秒以内に表示する（Requirement 2.6, 7.2）

### Requirement M11: Firebase依存の完全削除

**Objective:** As a 開発者, I want Firebase依存を完全に削除する, so that ビルド問題を解決できる

#### Acceptance Criteria

1. `@react-native-firebase/*`パッケージをアンインストールする
2. `firebase-admin`パッケージをアンインストールする
3. Firebase設定ファイル（GoogleService-Info.plist等）を削除する
4. Firebase関連のコード・型定義を削除する
5. Expoビルドが成功することを確認する

### Requirement M12: データ移行

**Objective:** As a 開発者, I want 既存データをSupabaseに移行する, so that 本番環境でサービスを継続できる

#### Acceptance Criteria

1. Firestoreからデータをエクスポートするスクリプトを作成する
2. エクスポートしたデータをSupabase用に変換する
3. Supabaseにデータをインポートする
4. データの整合性を検証する

### Requirement M13: 環境変数管理

**Objective:** As a 開発者, I want 環境変数を適切に管理する, so that APIキーを安全に扱える

#### Acceptance Criteria

1. Vercel環境変数にSupabase認証情報を追加する
2. ローカル開発用の`.env.local`を更新する
3. `.env.example`にSupabase用の環境変数テンプレートを追加する
4. Firebase環境変数を削除する

### Requirement M14: テスト・検証

**Objective:** As a 開発者, I want 移行後のシステムをテストする, so that 正常動作を確認できる

#### Acceptance Criteria

1. バックエンドのユニットテストをSupabase用に更新する
2. フロントエンドのユニットテストをSupabase用に更新する
3. バッチ処理の統合テストを実施する
4. オフライン動作の検証を実施する
5. iOSビルドが成功することを確認する
6. 本番環境でのE2Eテストを実施する

---

## 4. 前提条件

以下のタスクは移行前に完了している前提とする：

- Task 24.1-24.3: Terms UI最適化
- Task 25.1: Expo Router初期読み込み最適化
- Task 27.1-27.2: バッチ並列/Claude最適化
- Task 30.1, 31.1, 31.3: セキュリティ基盤

---

## 5. 制約事項

### 5.1 技術的制約

- Supabase無料プランの制限（500MB、2GB帯域/月）を遵守する
- 月間運用コスト1,000円以下を維持する（Requirement 10.1）
- オフライン時のデータ表示は1秒以内（Requirement 2.6, 7.2）

### 5.2 運用制約

- 移行中のサービス停止を最小化する
- 既存のAPIエンドポイント（/api/batch/news, /api/batch/terms）のURLを維持する
- 既存のCron設定（毎日8:00 JST）を維持する

---

## 6. 成功基準

1. Expo Dev Clientでのビルドが成功する
2. 全てのユニットテストがパスする
3. バッチ処理が正常に動作する（98%以上の成功率）
4. オフライン時にキャッシュデータを1秒以内に表示する
5. 既存機能が全て正常に動作する
