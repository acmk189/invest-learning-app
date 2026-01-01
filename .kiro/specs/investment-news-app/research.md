# Research & Design Decisions

---

## **Purpose**: 技術設計を支える発見事項、アーキテクチャ調査、設計判断の根拠を記録する。

## Summary

- **Feature**: `investment-news-app`
- **Discovery Scope**: 複合的な新機能（Complex Integration）
- **Key Findings**:
  - React Native New Architecture（0.76以降）がデフォルトで有効化され、Expo SDK 53で完全サポート
  - Vercel Serverless FunctionsとFirebase Firestoreの統合にはfirebase-admin SDKが必須
  - NewsAPI無料枠は開発用のみ、本番環境では有料プランまたは代替APIの検討が必要
  - Claude APIのHaikuモデルを使用することでコスト最適化が可能
  - Firestore無料枠（1日50,000読み取り、20,000書き込み）は個人利用には十分

## Research Log

### React Native + Expo最新アーキテクチャ（2026年1月時点）

- **Context**: モバイルアプリのフロントエンド技術スタック選定
- **Sources Consulted**:
  - [React Native's New Architecture - Expo Documentation](https://docs.expo.dev/guides/new-architecture/)
  - [React Native in 2026: The New Architecture](https://guilhermealbert.com/blog/react-native-new-architecture/)
  - [Expo MVVM Template](https://www.bitcot.com/expo-mvvm-template-react-native/)
- **Findings**:
  - React Native 0.76（2024年12月）からNew Architectureがデフォルト有効
  - Expo SDK 53で全expo-\*パッケージがNew Architecture対応完了
  - MVVMパターンがExpoアプリのベストプラクティスとして推奨
  - Expo Routerによるファイルベースルーティングが標準化
  - EAS BuildとOTAアップデートによるCI/CD対応
- **Implications**:
  - 最新のExpo SDK（SDK 53以上）を使用することで安定性と性能を確保
  - MVVMアーキテクチャを採用し、ビジネスロジックとUIを明確に分離
  - Expo Routerを使用したタブナビゲーション実装

### Vercel Serverless Functions + Firebase Firestore統合パターン

- **Context**: バックエンドAPI、Cron Jobs、データベースの統合方法
- **Sources Consulted**:
  - [Vercel Functions](https://vercel.com/docs/functions)
  - [Node.js in Serverless - AWS Lambda, Vercel, and Firebase Functions](https://medium.com/@priyanshu011109/%EF%B8%8F-node-js-in-serverless-aws-lambda-vercel-and-firebase-functions-explained-039256e56a89)
  - [Tutorial: Dynamic Scheduled Background Jobs in Firebase](https://fireship.io/lessons/cloud-functions-scheduled-time-trigger/)
- **Findings**:
  - Vercel Serverless Functionsからfirebase-admin SDKを使用してFirestoreにアクセス
  - Vercel Cron JobsはAuthorization: Bearer {CRON_SECRET}で保護
  - Firebase Cloud Schedulerとの比較: Vercelの方がデプロイが簡単
  - Serverless環境では従来のCron Jobsは実行不可、スケジューラーベースの実装が必要
- **Implications**:
  - バックエンドはVercel Serverless Functionsで統一し、firebase-adminで認証
  - Cron Jobs用のシークレットキー管理が必須
  - 日次バッチ処理は毎朝8:00 JSTに実行（Vercel Cron構文: `0 8 * * *` UTC+9調整必要）

### NewsAPI統合と制約

- **Context**: 世界と日本のニュース取得元API
- **Sources Consulted**:
  - [NewsAPI Documentation](https://newsapi.org/docs)
  - [NewsAPI Pricing](https://newsapi.org/pricing)
  - [Top 13 Best News API in 2026](https://apileague.com/articles/best-news-api/)
- **Findings**:
  - NewsAPI無料枠は開発用のみ、商用利用不可
  - エンドポイント: `/v2/everything` (キーワード検索), `/v2/top-headlines` (カテゴリ別)
  - Rate Limit: 429エラー発生時はバックオフが必要
  - 認証: APIキーをURLパラメータまたはヘッダーで送信
  - レスポンス形式: JSON（articles配列）
- **Implications**:
  - 初期開発ではNewsAPI無料枠を使用、本番環境では有料プラン契約または代替API検討
  - キャッシュ実装によりAPI呼び出し回数を削減（1日1回の更新で十分）
  - エラーハンドリングとリトライロジックが必須
  - Google News RSSを併用して日本のニュースを補完

### Claude API - テキスト要約・翻訳

- **Context**: ニュース記事の要約・翻訳、投資用語生成
- **Sources Consulted**:
  - [Claude API Getting Started](https://platform.claude.com/docs/en/api/getting-started)
  - [Text Processing - Claude Docs](https://docs.anthropic.com/claude/docs/text-processing)
  - [Legal summarization - Claude Docs](https://docs.claude.com/en/docs/about-claude/use-case-guides/legal-summarization)
- **Findings**:
  - 認証: `x-api-key`, `anthropic-version`, `content-type: application/json`ヘッダー
  - モデル選択: Haiku（高速・低コスト）vs Sonnet（高品質）
  - リクエストサイズ上限: 32MB（通常）、256MB（Batch API）
  - XML tagによる構造化プロンプトが推奨（例: `<article></article>`）
  - 長文要約にはメタ要約（チャンク分割→個別要約→統合）が有効
  - Rate Limit: 使用階層によりRPM/TPM制限あり
- **Implications**:
  - コスト最適化のためHaikuモデルを優先使用、品質が不足する場合のみSonnet
  - プロンプト設計: XML tagで記事区切り、要約指示を明確化
  - トークン使用量監視と月間コスト上限アラート設定
  - Batch APIは不要（リアルタイム処理で5分以内完了見込み）

### Firebase Firestore オフライン対応 - React Native

- **Context**: アプリのオフライン機能実装
- **Sources Consulted**:
  - [Offline Support | React Native Firebase](https://rnfirebase.io/database/offline-support)
  - [Firestore Offline Mode Gotchas](https://dev.to/blarzhernandez/a-few-gotchas-to-consider-when-working-with-firestore-s-offline-mode-and-react-native-42al)
  - [Cloud Firestore Usage and Limits](https://firebase.google.com/docs/firestore/quotas)
- **Findings**:
  - React Native Firebase (@react-native-firebase/firestore)でオフライン永続化がデフォルト有効（iOS/Android）
  - 書き込み操作では`await`を避ける（サーバー同期完了まで待機し、UIがブロックされる）
  - トランザクションはオフライン時に失敗する
  - Expo環境ではexpo-firestore-offline-persistenceパッケージが必要
  - Firestore無料枠: 1日50,000読み取り、20,000書き込み、1GBストレージ
  - ドキュメントサイズ上限: 1MB
- **Implications**:
  - @react-native-firebase/firestoreを使用（Expoの制約を考慮し、必要に応じてexpo-firestore-offline-persistenceを検討）
  - 書き込み操作は非同期で実行し、ユーザーフィードバックはキャッシュ更新で即座に表示
  - トランザクション不使用、単純なドキュメント書き込みのみ
  - データモデル設計: ニュースと用語を別コレクションに格納、1ドキュメント1MB以下を厳守

### Google News RSS（日本のニュース取得）

- **Context**: NewsAPIの補完としてGoogle News RSSを調査
- **Sources Consulted**: Webサーチ結果、Google News RSS公式情報
- **Findings**:
  - Google News RSSは無料、Rate Limit制限なし
  - RSS形式（XML）、パース処理が必要
  - カテゴリ・キーワードベースでフィード取得可能
  - NewsAPIと異なり、記事全文は含まれず要約のみ
- **Implications**:
  - 日本のニュース取得にGoogle News RSSを使用し、NewsAPI呼び出し回数を削減
  - XML→JSONパース処理をバッチシステムに組み込む
  - 記事要約が不十分な場合、NewsAPIで補完

## Architecture Pattern Evaluation

| Option                         | Description                                                    | Strengths                                                  | Risks / Limitations              | Notes                            |
| ------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------- | -------------------------------- |
| MVVM (Model-View-ViewModel)    | UIとビジネスロジックを分離、ViewModelが状態管理                | テスタビリティ向上、コード再利用性、Expoベストプラクティス | 学習コスト、小規模アプリでは過剰 | Expo MVVM Templateが推奨パターン |
| Feature-based Folder Structure | 機能単位でフォルダ分割（screens, components, hooks, services） | スケーラビリティ、保守性、チーム開発対応                   | 初期構造設計が重要               | React Nativeコミュニティ標準     |
| Repository Pattern             | データアクセス層を抽象化、Firestore操作をカプセル化            | データソース切り替え容易、テスト容易                       | 抽象化レイヤー追加               | 将来的なデータソース変更に対応   |

**選択したパターン**: MVVM + Feature-based + Repository Pattern

- MVVMでUI/ロジック分離
- Feature-basedでニュース機能と用語機能を独立管理
- Repositoryパターンでデータアクセスを抽象化

## Design Decisions

### Decision: モノレポ構成（フロントエンド・バックエンド統合）vs 分離構成

- **Context**: React Nativeアプリ（フロントエンド）とVercel Functions（バックエンド）の管理方法
- **Alternatives Considered**:
  1. **モノレポ構成** - 単一リポジトリでフロントエンド・バックエンドを管理
  2. **分離構成** - フロントエンド用とバックエンド用に別々のリポジトリ
- **Selected Approach**: モノレポ構成
  - プロジェクトルート直下に`/app`（React Native）、`/api`（Vercel Functions）を配置
  - package.jsonでワークスペース管理
- **Rationale**:
  - 個人開発プロジェクトのため、シンプルな管理が優先
  - 型定義（TypeScript）の共有が容易
  - デプロイ設定が一元化（Vercel自動デプロイ）
- **Trade-offs**:
  - Benefits: 型共有、コード再利用、デプロイ簡略化
  - Compromises: リポジトリサイズ増加、ビルド時間若干増加（影響小）
- **Follow-up**: ワークスペース設定の動作確認、Vercel設定（vercel.json）の検証

### Decision: Claude APIモデル選択（Haiku vs Sonnet）

- **Context**: ニュース要約・用語生成のコスト最適化
- **Alternatives Considered**:
  1. **Haiku** - 高速・低コスト、簡易タスク向け
  2. **Sonnet** - 高品質・高コスト、複雑タスク向け
- **Selected Approach**: Haikuを優先使用、品質不足時のみSonnetにフォールバック
- **Rationale**:
  - 月間運用コスト1,000円以下の制約
  - ニュース要約は2000文字程度、用語解説は500文字程度と比較的短文
  - 初期段階ではHaikuで十分な品質が得られる見込み
- **Trade-offs**:
  - Benefits: コスト削減、レスポンス速度向上
  - Compromises: 要約品質がSonnetより劣る可能性
- **Follow-up**: 実装後に要約品質を評価、必要に応じてSonnetへ切り替え

### Decision: データ保持期間30日とクリーンアップ戦略

- **Context**: Firestoreストレージコスト削減とデータ管理
- **Alternatives Considered**:
  1. **全履歴保持** - すべてのニュース・用語を永続保存
  2. **30日間保持** - 過去30日分のみ保持、古いデータは自動削除
  3. **7日間保持** - より短期間のみ保持
- **Selected Approach**: 30日間保持
  - ニュースは30日経過後に自動削除
  - 用語は重複チェック用に全履歴保持（軽量データのため）
- **Rationale**:
  - 初期リリースでは過去ニュース閲覧機能を含まない
  - 30日分でFirestore無料枠（1GB）内に収まる見込み
  - 将来的な過去閲覧機能実装時の猶予期間
- **Trade-offs**:
  - Benefits: ストレージコスト削減、クエリパフォーマンス向上
  - Compromises: 過去ニュースへのアクセス不可
- **Follow-up**: Firestore TTL（Time-to-Live）機能を使用した自動削除実装

### Decision: Expo Managed Workflow vs Bare Workflow

- **Context**: Expoの開発ワークフロー選択
- **Alternatives Considered**:
  1. **Managed Workflow** - Expo標準環境、ネイティブコード触らない
  2. **Bare Workflow** - ネイティブコードへのフルアクセス
- **Selected Approach**: Managed Workflow（初期段階）
- **Rationale**:
  - 初期リリースではネイティブモジュールのカスタマイズ不要
  - 開発・デプロイの簡素化
  - 将来的に必要であればBareへの移行可能
- **Trade-offs**:
  - Benefits: 開発速度向上、設定簡素化
  - Compromises: ネイティブカスタマイズ制限
- **Follow-up**: SDK 53以上でプロジェクト初期化、New Architecture対応確認

## Risks & Mitigations

- **NewsAPI無料枠の制限** - 本番環境では有料プラン契約が必要。初期段階ではキャッシュ戦略（1日1回更新）で呼び出し回数を最小化。代替APIとしてGoogle News RSSを併用。
- **Claude APIコスト超過** - トークン使用量監視とアラート設定。Haikuモデル優先使用、月間コストが800円を超えた場合は要約頻度の調整またはキャッシュ期間延長を検討。
- **Firestore無料枠超過** - データ保持期間30日に制限、ドキュメントサイズ1MB以下を厳守。読み取り回数削減のためオフラインキャッシュを積極活用。
- **Vercel Cron Jobs信頼性** - バッチ処理失敗時のリトライロジック実装（最大3回）。エラーログをFirestoreに記録し、手動リトライ可能な設計。
- **外部API障害** - NewsAPI、Claude API、Google News RSSのいずれかが障害時、部分的にサービス提供継続（例: ニュースのみ、または用語のみ）。Graceful degradation実装。
- **React Native New Architectureの互換性** - Expo SDK 53以上を使用し、全パッケージの互換性を確保。実装前にExpo公式ドキュメントで最新情報を確認。

## References

- [React Native's New Architecture - Expo Documentation](https://docs.expo.dev/guides/new-architecture/)
- [Expo MVVM Template](https://www.bitcot.com/expo-mvvm-template-react-native/)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Tutorial: Dynamic Scheduled Background Jobs in Firebase](https://fireship.io/lessons/cloud-functions-scheduled-time-trigger/)
- [NewsAPI Documentation](https://newsapi.org/docs)
- [Claude API Getting Started](https://platform.claude.com/docs/en/api/getting-started)
- [Text Processing - Claude Docs](https://docs.anthropic.com/claude/docs/text-processing)
- [Offline Support | React Native Firebase](https://rnfirebase.io/database/offline-support)
- [Cloud Firestore Usage and Limits](https://firebase.google.com/docs/firestore/quotas)
- [Firestore Offline Mode Gotchas](https://dev.to/blarzhernandez/a-few-gotchas-to-consider-when-working-with-firestore-s-offline-mode-and-react-native-42al)
