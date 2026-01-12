/**
 * Expo アプリ設定ファイル
 *
 * 環境変数を読み込み、アプリの設定を動的に生成します。
 * .env.local から Supabase の接続情報を読み込みます。
 *
 * @see https://docs.expo.dev/versions/latest/config/app/
 */

require('dotenv').config({ path: '.env.local' });

module.exports = {
  expo: {
    name: 'invest-learning-app',
    slug: 'invest-learning-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    scheme: 'invest-learning',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.investlearning.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.investlearning.app',
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: ['expo-router'],
    // 環境変数をアプリに渡す
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    },
  },
};
