/**
 * Firebase Admin SDK 初期化
 *
 * Requirements: 12.3, 9.1, 9.2
 *
 * サービスアカウント認証を使用してFirebase Admin SDKを初期化します。
 * 環境変数から認証情報を読み込み、Firestoreへの接続を確立します。
 */

import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDKのシングルトンインスタンス
 */
let firebaseApp: admin.app.App | undefined;

/**
 * Firebase Admin SDKを初期化
 *
 * 環境変数から認証情報を読み込み、既に初期化されていない場合のみ初期化を実行します。
 *
 * @returns 初期化されたFirebase Appインスタンス
 * @throws 環境変数が不足している場合にエラーをスロー
 */
export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  // 環境変数の検証
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      'Firebase環境変数が不足しています: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL'
    );
  }

  // Private keyの改行文字を正しく処理
  // エスケープされた改行(\n)と実際の改行の両方に対応
  const formattedPrivateKey = privateKey.includes('\\n')
    ? privateKey.replace(/\\n/g, '\n')
    : privateKey;

  // Firebase Admin SDKを初期化
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey: formattedPrivateKey,
      clientEmail,
    }),
  });

  return firebaseApp;
}

/**
 * Firestoreインスタンスを取得
 *
 * @returns Firestoreインスタンス
 */
export function getFirestore(): admin.firestore.Firestore {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

/**
 * Firebase Appインスタンスを取得
 *
 * @returns Firebase Appインスタンス
 */
export function getFirebaseApp(): admin.app.App {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return firebaseApp!;
}
