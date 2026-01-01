# Investment Learning App

投資初学者向けの個人利用投資学習支援モバイルアプリケーション

## プロジェクト構成

このプロジェクトはモノレポ構成を採用しており、以下のワークスペースで構成されています。

- **mobile/**: React Native (Expo) モバイルアプリケーション
- **backend/**: Vercel Serverless Functions バックエンド

## 技術スタック

- **Frontend**: React Native (Expo SDK 54+), TypeScript
- **Backend**: Vercel Serverless Functions, Node.js 20
- **Database**: Firebase Firestore
- **AI Processing**: Claude API (Anthropic)
- **External APIs**: NewsAPI, Google News RSS

## セットアップ

### 前提条件

- Node.js 20以降
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# mobile/ と backend/ の依存関係もインストールされます
```

### 環境変数

プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定してください:

```bash
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# NewsAPI
NEWS_API_KEY=your-newsapi-key

# Claude API
CLAUDE_API_KEY=your-claude-api-key

# Vercel Cron
CRON_SECRET=your-cron-secret
```

## 開発

### テスト実行

```bash
npm test
```

### Lint

```bash
npm run lint
```

### フォーマット

```bash
npm run format
```

### モバイルアプリ起動

```bash
cd mobile
npm start
```

### バックエンド開発サーバー

```bash
cd backend
npm run dev
```

## プロジェクト構造

```
invest-learning-app/
├── mobile/                 # React Native モバイルアプリ
│   ├── src/               # ソースコード
│   ├── package.json
│   └── tsconfig.json
├── backend/               # Vercel Serverless Functions
│   ├── src/              # ソースコード
│   ├── package.json
│   └── tsconfig.json
├── __tests__/            # ルートレベルのテスト
├── .kiro/                # Spec-Driven Development artifacts
├── package.json          # ルートのワークスペース設定
├── tsconfig.json         # ルートのTypeScript設定
├── .eslintrc.json        # ESLint設定
├── .prettierrc.json      # Prettier設定
└── jest.config.js        # Jestテスト設定
```

## ライセンス

Private
