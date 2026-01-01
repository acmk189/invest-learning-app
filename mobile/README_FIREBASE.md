# Firebase Firestore接続設定 (タスク1.2)

## 概要

このドキュメントは、投資学習アプリのモバイルアプリケーションにおけるFirebase Firestore接続設定の実装内容をまとめたものです。

## 実装内容

### 1. Firebase依存関係のインストール

以下のパッケージをインストールしました:

- `@react-native-firebase/app@^23.7.0` - Firebase Core SDK
- `@react-native-firebase/firestore@^23.7.0` - Firestore SDK

### 2. Firebase設定ファイル

#### `src/config/firebase.ts`

Firestore接続の初期化、オフライン永続化、接続テストを提供する設定モジュールを実装しました。

**主要機能:**

- `initializeFirestore()` - Firestoreの初期化とオフライン永続化の有効化
- `testFirestoreConnection()` - Firestore接続テスト (読み書き動作確認)
- `getFirestore()` - Firestoreインスタンス取得
- `FIRESTORE_COLLECTIONS` - コレクション名の定数定義

**オフライン永続化設定:**

- デフォルトで永続化を有効化
- キャッシュサイズ: 100MB (設定可能)

### 3. Expo App設定

#### `app.json`

Firebase Pluginsを追加し、iOS/Android向けのGoogle Services設定を定義しました。

```json
{
  "plugins": [
    "@react-native-firebase/app",
    "@react-native-firebase/firestore"
  ],
  "ios": {
    "googleServicesFile": "./GoogleService-Info.plist"
  },
  "android": {
    "googleServicesFile": "./google-services.json"
  }
}
```

### 4. GoogleService-Info.plist (プレースホルダー)

iOS向けのFirebase設定ファイルのプレースホルダーを作成しました。

**実際のプロジェクトで必要な手順:**

1. Firebase Console (https://console.firebase.google.com/) でプロジェクトを作成
2. iOSアプリを追加 (Bundle ID: `com.investlearning.app`)
3. `GoogleService-Info.plist`をダウンロード
4. プレースホルダーファイルを実際のファイルで置き換え

### 5. テスト実装

#### `__tests__/firebase/firestore.test.ts`

Firebase Firestore接続の包括的なテストスイートを実装しました。

**テストカバレッジ:**

- ✓ Firestoreインスタンスの初期化
- ✓ オフライン永続化の有効化
- ✓ 接続テスト (読み書き動作)
- ✓ コレクションアクセス (news, terms, terms_history, error_logs)
- ✓ 設定定数の検証

**テスト結果:**

```
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

### 6. Jest設定

#### `jest.config.js` & `jest.setup.js`

TypeScriptとFirebase mocksに対応したJest設定を構築しました。

- ts-jest preset使用
- Firebase SDKのモック設定
- TypeScriptトランスパイル設定

## Requirements対応

### Requirement 12.3: Firebase Firestoreを使用する

- ✅ `@react-native-firebase/firestore`をインストール
- ✅ Firestore接続を初期化
- ✅ コレクション定義を実装

### Requirement 2.5: オフライン状態でキャッシュ済みのニュースを表示する

- ✅ オフライン永続化を有効化
- ✅ キャッシュサイズ (100MB) を設定
- ✅ キャッシュ動作のテストを実装

## ファイル構成

```
mobile/
├── src/
│   └── config/
│       └── firebase.ts           # Firebase設定モジュール
├── __tests__/
│   └── firebase/
│       └── firestore.test.ts     # Firestoreテスト
├── app.json                       # Expo設定 (Firebase plugins追加)
├── GoogleService-Info.plist       # iOS Firebase設定 (プレースホルダー)
├── jest.config.js                 # Jest設定
├── jest.setup.js                  # Jest mockセットアップ
└── package.json                   # 依存関係定義
```

## 次のステップ

1. Firebase Consoleで実際のプロジェクトを作成
2. `GoogleService-Info.plist`を実際のファイルで置き換え
3. Firestoreデータベースを有効化
4. セキュリティルールを設定
5. タスク1.3: Vercel + Firebase Admin SDK設定へ進む

## 参考リンク

- [Firebase Console](https://console.firebase.google.com/)
- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
