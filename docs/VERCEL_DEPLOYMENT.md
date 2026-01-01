# Vercelデプロイメントガイド

## 前提条件

- Vercel CLIがインストールされていること（`npm install -g vercel`）
- Vercelアカウントを持っていること
- Firebase プロジェクトが作成されていること
- 必要なAPIキー（NewsAPI、Claude API）を取得済みであること

## 環境変数の設定

### 1. Firebase認証情報の取得

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを開く
2. プロジェクト設定 → サービスアカウント → 新しい秘密鍵の生成
3. JSONファイルをダウンロード
4. 以下の値を取得:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### 1-2. NewsAPI キーの取得

1. [NewsAPI](https://newsapi.org/) にアクセス
2. 「Get API Key」をクリックしてアカウント登録
3. 登録後、ダッシュボードに表示される API Key をコピー
4. この値を `NEWS_API_KEY` として設定

**注意**:
- 無料プランは開発用で、本番環境では有料プラン（Business Plan: $449/month）が必要
- 無料プランの制限: 100リクエスト/日、過去1ヶ月のニュースのみ
- 詳細は[料金ページ](https://newsapi.org/pricing)を確認

### 1-3. Claude API (Anthropic) キーの取得

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. アカウント登録またはログイン
3. 左メニューから「API Keys」を選択
4. 「Create Key」をクリックして新しいAPIキーを生成
5. 生成されたキーをコピー（**一度しか表示されません**）
6. この値を `CLAUDE_API_KEY` として設定

**注意**:
- Claude APIは使用量に応じた従量課金制
- 初回登録時にクレジットが付与される場合があります
- 料金の詳細は[Anthropic Pricing](https://www.anthropic.com/pricing)を確認
- 使用するモデル（例: claude-3-sonnet）によって料金が異なります

### 2. Vercel環境変数の登録

#### 方法1: Vercel Web UI を使用（推奨）

長い秘密鍵の場合、Web UIを使うと確実です：

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択
3. Settings → Environment Variables
4. 各環境変数を追加:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`（改行を含む秘密鍵をそのままペースト）
   - `FIREBASE_CLIENT_EMAIL`
   - `NEWS_API_KEY`
   - `CLAUDE_API_KEY`
   - `CRON_SECRET`
5. 環境を選択（Production, Preview, Development）

#### 方法2: CLIでファイルから読み込み

秘密鍵をファイルに保存してから読み込む方法：

```bash
# .secretsディレクトリに一時ファイルを作成（gitignore済み）
# Firebase Admin SDKのJSONから private_key の値だけを抽出
cat .secrets/investment-learning-app-firebase-adminsdk-*.json | \
  jq -r '.private_key' > .secrets/firebase_private_key.txt

# ファイルから読み込んで設定
vercel env add FIREBASE_PRIVATE_KEY production < .secrets/firebase_private_key.txt

# 他の環境変数は通常通り
vercel env add FIREBASE_PROJECT_ID production
# プロンプトで値を入力

vercel env add FIREBASE_CLIENT_EMAIL production
# プロンプトで値を入力

vercel env add NEWS_API_KEY production
vercel env add CLAUDE_API_KEY production
vercel env add CRON_SECRET production

# 設定後、一時ファイルを削除
rm .secrets/firebase_private_key.txt
```

#### 方法3: CLIでインタラクティブに登録

```bash
# Firebase設定
vercel env add FIREBASE_PROJECT_ID production
vercel env add FIREBASE_PRIVATE_KEY production
vercel env add FIREBASE_CLIENT_EMAIL production

# NewsAPI
vercel env add NEWS_API_KEY production

# Claude API (Anthropic)
vercel env add CLAUDE_API_KEY production

# Cron Secret（ランダムな文字列を生成）
vercel env add CRON_SECRET production
```

**注意**: `FIREBASE_PRIVATE_KEY` は改行を含むため、そのまま貼り付けるとコンソールが応答しなくなる場合があります。その場合は方法1または方法2を使用してください。

### 3. 環境変数の検証

環境変数が正しく設定されているか確認:

```bash
vercel env ls
```

## デプロイ手順

### 1. Vercelプロジェクトとリンク

```bash
# ルートディレクトリで実行
vercel link
```

プロンプトに従って:
- スコープを選択（個人アカウントまたは組織）
- 新しいプロジェクトを作成するか、既存プロジェクトにリンク
- プロジェクト名を入力（例: investment-news-app）
- ルートディレクトリを確認: `./backend`

### 2. デプロイ実行

```bash
# プレビューデプロイ
cd backend
vercel

# 本番デプロイ
vercel --prod
```

### 3. デプロイ検証

デプロイ完了後、ヘルスチェックエンドポイントで検証:

```bash
curl https://your-project.vercel.app/api/health
```

期待されるレスポンス:

```json
{
  "status": "ok",
  "message": "Health check passed",
  "firestore": "connected",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## トラブルシューティング

### Firebase接続エラー

- `FIREBASE_PRIVATE_KEY`の改行文字が正しく設定されているか確認
- サービスアカウントの権限を確認（Firestore管理者権限が必要）

### 環境変数が読み込まれない

- Vercel環境変数が本番環境（Production）に設定されているか確認
- `vercel env pull`で環境変数をローカルにダウンロードして確認

### デプロイタイムアウト

- `vercel.json`のmaxDuration設定を確認（最大300秒）
- バッチ処理が5分以内に完了するよう最適化

## ローカル開発

ローカルで環境変数を使用する場合:

```bash
# .env.localファイルを作成（.gitignoreに追加済み）
vercel env pull .env.local

# ローカル開発サーバー起動
cd backend
vercel dev
```

## 参考リンク

- [Vercel環境変数ドキュメント](https://vercel.com/docs/concepts/projects/environment-variables)
- [Firebase Admin SDK セットアップ](https://firebase.google.com/docs/admin/setup)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
