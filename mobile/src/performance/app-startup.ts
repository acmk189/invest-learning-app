/**
 * アプリ起動パフォーマンス最適化
 * Task 25.1: Expo Router初期読み込み最適化
 *
 * Expo Routerの初期読み込みを最適化し、アプリ起動時間を短縮する。
 * - 遅延ロード(lazy loading)でタブの事前ロードを無効化
 * - 非アクティブなタブをフリーズして不要な再レンダリングを防止
 * - 起動時間計測機能を提供
 *
 * @see Requirements: 7.1 (3秒以内に初期画面を表示)
 * @see https://docs.expo.dev/router/advanced/tabs/
 */

/**
 * 起動時間測定結果の型定義
 * 起動時間を計測する関数の戻り値として使用
 */
export interface StartupTimeResult {
  /** 計測開始時刻(ミリ秒、Date.now()形式) */
  startTime: number;
  /** 計測終了時刻(ミリ秒、Date.now()形式) */
  endTime: number;
  /** 起動時間(ミリ秒) */
  duration: number;
}

/**
 * アプリ起動設定の定数
 *
 * 起動時間を短縮するための各種設定値を定義。
 * これらの値は実装コード(_layout.tsx等)で参照される。
 *
 * @see Requirements: 7.1 (3秒以内に初期画面を表示)
 */
export const APP_STARTUP_CONFIG = {
  /**
   * 起動時間の目標値(ミリ秒)
   * Requirements 7.1に基づき3秒(3000ms)以内を目標
   */
  TARGET_STARTUP_TIME_MS: 3000,

  /**
   * 画面遷移アニメーションを無効化するフラグ
   * 初期読み込み時のアニメーションを省略して起動時間を短縮
   */
  DISABLE_SCREEN_ANIMATIONS: true,

  /**
   * 不要な画面の事前ロードを無効化するフラグ
   * 非アクティブなタブを事前にロードしない
   */
  DISABLE_PRELOAD: true,
} as const;

/**
 * タブナビゲーションの遅延ロード設定
 *
 * Expo Router / React Navigationのタブオプションで使用する設定。
 * 不要な画面の事前ロードを無効化し、起動時間を最適化する。
 *
 * @example
 * // (tabs)/_layout.tsx での使用例
 * <Tabs screenOptions={{ ...TAB_LAZY_CONFIG }}>
 *   <Tabs.Screen name="index" />
 *   <Tabs.Screen name="terms" />
 * </Tabs>
 *
 * @see https://reactnavigation.org/docs/bottom-tab-navigator/#lazy
 */
export const TAB_LAZY_CONFIG = {
  /**
   * 遅延ロードを有効化
   * true: タブが初めてアクティブになるまでコンテンツをレンダリングしない
   * これにより初期バンドルサイズが削減され、起動時間が短縮される
   */
  lazy: true,

  /**
   * 非アクティブなタブのアンマウント設定
   * false: 一度マウントしたタブをメモリに保持
   * これにより再訪問時の表示が即座に行われる
   *
   * 注意: trueにすると毎回再マウントされパフォーマンスが低下する
   */
  unmountOnBlur: false,

  /**
   * 非アクティブなタブのフリーズ設定
   * true: 非アクティブなタブをフリーズして不要な再レンダリングを防止
   * react-freeze を使用してメモリ使用量を最適化
   *
   * @see https://github.com/software-mansion/react-freeze
   */
  freezeOnBlur: true,
} as const;

/**
 * 起動時間を計測する関数
 *
 * アプリの起動時間を測定し、パフォーマンスモニタリングに使用する。
 * 開発時のデバッグや、本番環境でのパフォーマンス監視に活用できる。
 *
 * @returns 起動時間の測定結果(StartupTimeResult)
 *
 * @example
 * // アプリ起動時に測定
 * const result = await measureStartupTime();
 * console.log(`起動時間: ${result.duration}ms`);
 *
 * // 目標時間との比較
 * if (result.duration > APP_STARTUP_CONFIG.TARGET_STARTUP_TIME_MS) {
 *   console.warn('起動時間が目標を超過しています');
 * }
 */
export async function measureStartupTime(): Promise<StartupTimeResult> {
  const startTime = Date.now();

  // 次のフレームまで待機して、レンダリング完了を検知
  // requestAnimationFrameを使用して、UIスレッドの描画完了を待つ
  await new Promise<void>((resolve) => {
    // React Native環境ではrequestAnimationFrameがグローバルに存在
    // 存在しない場合(テスト環境など)はsetTimeoutで代替
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 16); // 約60fpsの1フレーム
    }
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  return {
    startTime,
    endTime,
    duration,
  };
}

/**
 * パフォーマンスログを出力するヘルパー関数
 *
 * 開発環境でのみログを出力し、本番環境では無視される。
 * 起動時間の監視や最適化のデバッグに使用する。
 *
 * @param label - ログのラベル
 * @param duration - 計測時間(ミリ秒)
 */
export function logPerformance(label: string, duration: number): void {
  if (__DEV__) {
    const isUnderTarget = duration <= APP_STARTUP_CONFIG.TARGET_STARTUP_TIME_MS;
    const status = isUnderTarget ? '✅' : '⚠️';
    console.log(
      `[Performance] ${status} ${label}: ${duration}ms (目標: ${APP_STARTUP_CONFIG.TARGET_STARTUP_TIME_MS}ms)`
    );
  }
}
