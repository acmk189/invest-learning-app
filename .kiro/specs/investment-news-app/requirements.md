# Requirements Document

## Project Description (Input)

ユーザーが投資学習を行うために、日々のニュースや投資・金融用語を配信するスマホアプリ

## Introduction

本アプリケーションは、投資初学者向けの個人利用投資学習支援プラットフォームです。毎日の金融ニュース要約配信(AI処理)と投資・金融用語の学習機能を通じて、継続的な投資知識の習得と習慣形成を支援します。

**初期リリース(v1.0)スコープ**:

- 世界・日本の投資・企業・金融ニュース要約配信
- 投資・金融用語の日次配信(3用語/日)

**初期リリースで含まない機能**:

- ユーザー認証・ログイン機能
- 複数デバイス同期
- 過去ニュース閲覧機能
- ユーザー設定・カスタマイズ機能
- プッシュ通知

## Requirements

### Requirement 1: ニュース自動取得・処理

**Objective:** As a 開発者, I want ニュースを自動取得・要約処理する, so that 毎日最新の投資情報を配信できる

#### Acceptance Criteria

1. When 日次バッチが実行される, the バッチシステム shall 毎日8:00 (JST)にニュース記事を取得する
2. The バッチシステム shall NewsAPIから世界の投資ニュース(businessカテゴリ)を取得する
3. The バッチシステム shall Google News RSSから日本の投資・経済ニュースを取得する
4. When ニュース記事を取得する, the AI処理システム shall 複数記事を統合し約2000文字に要約する
5. When 英語記事を処理する, the AI処理システム shall 日本語に翻訳して要約する
6. The バッチシステム shall 処理完了後にFirestoreにニュースデータを保存する
7. If バッチ処理が失敗する, then the システム shall エラーログを記録しリトライ処理を実行する
8. The バッチシステム shall 5分以内にバッチ処理を完了する

### Requirement 2: ニュース表示機能

**Objective:** As a ユーザー, I want 当日のニュース要約を閲覧する, so that 効率的に世界と日本の経済動向を把握できる

#### Acceptance Criteria

1. When アプリを起動する, the ニュースタブ shall 当日のニュース要約を表示する
2. The ニュース画面 shall 「世界のニュース」「日本のニュース」の2カテゴリを表示する
3. The 各ニュースカード shall タイトル、要約本文(約2000文字)、更新日時を表示する
4. When 1日のどのタイミングでアプリを開く, the アプリ shall 同じ日のニュース内容を表示する
5. While オフライン状態, the アプリ shall キャッシュ済みのニュースを表示する
6. When キャッシュ済みデータを表示する, the アプリ shall 1秒以内にニュースを表示する

### Requirement 3: ニュースデータ管理

**Objective:** As a システム, I want ニュースデータを適切に管理する, so that データ容量とコストを最適化できる

#### Acceptance Criteria

1. The データ管理システム shall 最大30日分のニュース履歴を保持する
2. When 30日を超えるニュースデータが存在する, the データ管理システム shall 古いデータを自動削除する
3. The Firestoreドキュメント shall 1MB以下のサイズで保存される
4. The システム shall ニュース更新は1日1回(毎朝8:00)のみ実行する

### Requirement 4: 投資用語自動生成・配信

**Objective:** As a 開発者, I want 投資用語を自動生成・配信する, so that 毎日新しい学習コンテンツを提供できる

#### Acceptance Criteria

1. When 日次バッチが実行される, the AI処理システム shall 投資用語を1日3つ生成する
2. When 用語を生成する, the AI処理システム shall 各用語について分かりやすい解説(約500文字)を生成する
3. When 用語を選択する, the 重複チェックシステム shall 過去30日以内に配信した用語を除外する
4. The AI処理システム shall 初級から上級までの難易度が混在する用語を生成する
5. The バッチシステム shall 生成した用語データをFirestoreに保存する
6. The データ管理システム shall 配信済み用語の全履歴を保持する(重複チェック用)

### Requirement 5: 投資用語表示機能

**Objective:** As a ユーザー, I want 当日の投資用語を学習する, so that 投資知識を段階的に増やせる

#### Acceptance Criteria

1. When アプリを起動し用語タブを開く, the 用語タブ shall 当日の3つの投資用語を表示する
2. The 各用語カード shall 用語名、解説文(約500文字)を表示する
3. When 1日のどのタイミングでアプリを開く, the アプリ shall 同じ日の3つの用語を表示する
4. While オフライン状態, the アプリ shall キャッシュ済みの用語を表示する
5. The 用語タブ shall 最近配信された用語が再度表示されないことをユーザーに保証する

### Requirement 6: UI/UXデザイン

**Objective:** As a ユーザー, I want 読みやすく使いやすいインターフェースを利用する, so that 快適に学習を継続できる

#### Acceptance Criteria

1. The アプリ shall 「ニュース」「用語」の2タブでナビゲーションを提供する
2. When タブを切り替える, the アプリ shall 即座にタブコンテンツを表示する
3. The UI shall iOS端末の各サイズ(iPhone SE〜iPhone Pro Max)に適切に対応する
4. The テキスト表示 shall 適切なフォントサイズと行間で可読性を確保する
5. The アプリ shall ダークモード・ライトモードの両方に対応する

### Requirement 7: パフォーマンス要件

**Objective:** As a ユーザー, I want アプリを快適に利用する, so that ストレスなく毎日学習できる

#### Acceptance Criteria

1. When アプリを起動する, the アプリ shall 3秒以内に初期画面を表示する
2. When キャッシュ済みデータを読み込む, the アプリ shall 1秒以内にニュースまたは用語を表示する
3. The 日次バッチ処理 shall 5分以内に完了する
4. The アプリ shall iOS 14以降のデバイスでスムーズに動作する
5. If ネットワークエラーが発生する, then the アプリ shall 適切なエラーメッセージを表示しリトライオプションを提供する

### Requirement 8: 可用性要件

**Objective:** As a ユーザー, I want システムが安定して動作する, so that 毎日確実に情報を受け取れる

#### Acceptance Criteria

1. The アプリ shall 95%以上の稼働率を維持する
2. The 日次バッチ処理 shall 98%以上の成功率を達成する
3. If バッチ処理が失敗する, then the システム shall 自動リトライを3回まで実行する
4. The アプリ shall クラッシュ率1%以下を維持する
5. When 外部API障害が発生する, the システム shall エラーハンドリングと詳細ログ記録を実行する

### Requirement 9: セキュリティ・データ保護

**Objective:** As a 開発者, I want データとAPIキーを安全に管理する, so that セキュアなアプリを運用できる

#### Acceptance Criteria

1. The システム shall APIキー(NewsAPI, Claude API等)を環境変数で管理する
2. The コードベース shall APIキーをハードコーディングしない
3. When 外部APIと通信する, the システム shall HTTPS通信を使用する
4. The システム shall 通信データを暗号化して送受信する
5. The システム shall ユーザーの学習履歴を第三者と共有しない

### Requirement 10: コスト最適化

**Objective:** As a 開発者, I want 運用コストを最小化する, so that 持続可能な運用を実現できる

#### Acceptance Criteria

1. The システム shall 月間運用コストを1,000円以下に抑える
2. The システム shall NewsAPIの無料枠(100リクエスト/日)内で運用する
3. The システム shall Claude APIのトークン使用量を監視する
4. The システム shall Firebase Firestoreの無料枠内で運用する
5. The システム shall Vercel無料プランで運用する
6. If APIコストが想定を超える, then the システム shall アラートを記録しHaikuモデルへの切替を検討する

### Requirement 11: 保守性・拡張性

**Objective:** As a 開発者, I want コードの保守性を確保する, so that 将来的な機能拡張を容易にする

#### Acceptance Criteria

1. The コードベース shall ESLintルールに準拠する
2. The コードベース shall 適切なコメントとドキュメンテーションを含む
3. When エラーが発生する, the システム shall 詳細ログを記録する
4. The システム shall Gitでソースコード管理を行う
5. The アーキテクチャ shall 将来の機能拡張(ユーザー認証、過去履歴閲覧等)を考慮した設計とする

### Requirement 12: 技術スタック・システム制約

**Objective:** As a 開発者, I want 適切な技術スタックを使用する, so that 効率的に開発・運用できる

#### Acceptance Criteria

1. The フロントエンド shall React Native(Expo使用)で実装される
2. The バックエンド shall Vercel Serverless Functionsで実装される
3. The データベース shall Firebase Firestoreを使用する
4. The 定期実行処理 shall Vercel Cron Jobsを使用する
5. The AI処理 shall Claude API(Anthropic)を使用する
6. The アプリ shall iOS優先で開発され、将来的にAndroid対応を検討する
7. The システム shall 各外部サービスの利用規約を遵守する
