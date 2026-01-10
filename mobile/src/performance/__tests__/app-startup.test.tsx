/**
 * アプリ起動パフォーマンス テスト
 * Task 25.1: Expo Router初期読み込み最適化
 *
 * @see Requirements: 7.1 (3秒以内に初期画面を表示)
 */

import {
  APP_STARTUP_CONFIG,
  TAB_LAZY_CONFIG,
  measureStartupTime,
  StartupTimeResult,
} from '../app-startup';

describe('アプリ起動パフォーマンス最適化', () => {
  describe('Task 25.1: Expo Router初期読み込み最適化', () => {
    describe('APP_STARTUP_CONFIG定数', () => {
      it('起動時間の目標値が3秒以内に設定されている', () => {
        expect(APP_STARTUP_CONFIG.TARGET_STARTUP_TIME_MS).toBeLessThanOrEqual(
          3000
        );
      });

      it('画面遷移アニメーションが無効化されている', () => {
        expect(APP_STARTUP_CONFIG.DISABLE_SCREEN_ANIMATIONS).toBe(true);
      });

      it('不要な事前ロードが無効化されている', () => {
        expect(APP_STARTUP_CONFIG.DISABLE_PRELOAD).toBe(true);
      });
    });

    describe('TAB_LAZY_CONFIG定数', () => {
      it('遅延ロードがデフォルトで有効になっている', () => {
        expect(TAB_LAZY_CONFIG.lazy).toBe(true);
      });

      it('非アクティブなタブがアンマウントされない設定になっている', () => {
        // unmountOnBlur: false は、一度マウントしたタブをメモリに保持する
        // これにより再訪問時のパフォーマンスが向上
        expect(TAB_LAZY_CONFIG.unmountOnBlur).toBe(false);
      });

      it('フリーズ設定が適切に構成されている', () => {
        // freezeOnBlur: true は、非アクティブなタブをフリーズして
        // 不要な再レンダリングを防止
        expect(TAB_LAZY_CONFIG.freezeOnBlur).toBe(true);
      });
    });

    describe('measureStartupTime関数', () => {
      it('起動時間の測定結果を返す', async () => {
        const result = await measureStartupTime();

        expect(result).toHaveProperty('startTime');
        expect(result).toHaveProperty('endTime');
        expect(result).toHaveProperty('duration');
        expect(typeof result.duration).toBe('number');
      });

      it('測定結果の時間が非負の数である', async () => {
        const result = await measureStartupTime();

        // Jest環境ではsetTimeoutが即座に解決されることがあるため、0以上を許容
        expect(result.duration).toBeGreaterThanOrEqual(0);
        expect(result.startTime).toBeLessThanOrEqual(result.endTime);
      });

      it('測定結果がStartupTimeResult型に準拠している', async () => {
        const result: StartupTimeResult = await measureStartupTime();

        // 型チェック
        expect(typeof result.startTime).toBe('number');
        expect(typeof result.endTime).toBe('number');
        expect(typeof result.duration).toBe('number');
      });
    });

    describe('パフォーマンス設定の検証', () => {
      it('全ての最適化設定が有効になっている', () => {
        const allOptimizationsEnabled =
          APP_STARTUP_CONFIG.DISABLE_SCREEN_ANIMATIONS &&
          APP_STARTUP_CONFIG.DISABLE_PRELOAD &&
          TAB_LAZY_CONFIG.lazy &&
          TAB_LAZY_CONFIG.freezeOnBlur;

        expect(allOptimizationsEnabled).toBe(true);
      });

      it('設定が競合していない', () => {
        // lazy: true と unmountOnBlur: true は競合する可能性がある
        // unmountOnBlur: false が推奨
        if (TAB_LAZY_CONFIG.lazy) {
          expect(TAB_LAZY_CONFIG.unmountOnBlur).toBe(false);
        }
      });
    });
  });
});
