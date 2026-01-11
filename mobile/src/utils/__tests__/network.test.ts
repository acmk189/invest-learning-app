/**
 * ネットワーク状態検出ユーティリティ テスト
 * Task 11.3: ネットワーク状態検出実装
 *
 * Requirements:
 * - 10.2: ネットワーク状態の検出機能を実装する
 * - 10.3: オフライン時はキャッシュからデータを取得する
 */

import {
  getNetworkState,
  isOnline,
  isOffline,
  addNetworkStateListener,
  setNetworkState,
  resetNetworkState,
  updateNetworkStateFromRequest,
  NetworkState,
} from '../network';

describe('Network Utility', () => {
  beforeEach(() => {
    // 各テスト前に状態をリセット
    resetNetworkState();
  });

  describe('getNetworkState', () => {
    it('デフォルトでオンライン状態を返す', () => {
      const state = getNetworkState();

      expect(state.isConnected).toBe(true);
      expect(state.connectionType).toBe('unknown');
    });

    it('状態のコピーを返す(不変性)', () => {
      const state1 = getNetworkState();
      const state2 = getNetworkState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('isOnline / isOffline', () => {
    it('デフォルトでisOnline()はtrueを返す', () => {
      expect(isOnline()).toBe(true);
    });

    it('デフォルトでisOffline()はfalseを返す', () => {
      expect(isOffline()).toBe(false);
    });

    it('オフライン状態ではisOnline()はfalseを返す', () => {
      setNetworkState(false);

      expect(isOnline()).toBe(false);
    });

    it('オフライン状態ではisOffline()はtrueを返す', () => {
      setNetworkState(false);

      expect(isOffline()).toBe(true);
    });
  });

  describe('setNetworkState', () => {
    it('オンライン状態を設定できる', () => {
      setNetworkState(false); // まずオフラインに
      setNetworkState(true, 'wifi');

      const state = getNetworkState();
      expect(state.isConnected).toBe(true);
      expect(state.connectionType).toBe('wifi');
    });

    it('オフライン状態を設定できる', () => {
      setNetworkState(false, 'none');

      const state = getNetworkState();
      expect(state.isConnected).toBe(false);
      expect(state.connectionType).toBe('none');
    });

    it('接続タイプのデフォルトはunknown', () => {
      setNetworkState(true);

      const state = getNetworkState();
      expect(state.connectionType).toBe('unknown');
    });
  });

  describe('addNetworkStateListener', () => {
    it('状態変更時にリスナーが呼ばれる', () => {
      const listener = jest.fn();
      addNetworkStateListener(listener);

      // オフラインに変更
      setNetworkState(false);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isConnected: false })
      );
    });

    it('同じ状態に変更してもリスナーは呼ばれない', () => {
      const listener = jest.fn();
      addNetworkStateListener(listener);

      // 既にオンラインなのでリスナーは呼ばれない
      setNetworkState(true);

      expect(listener).not.toHaveBeenCalled();
    });

    it('複数のリスナーを登録できる', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      addNetworkStateListener(listener1);
      addNetworkStateListener(listener2);

      setNetworkState(false);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe関数でリスナーを解除できる', () => {
      const listener = jest.fn();
      const unsubscribe = addNetworkStateListener(listener);

      // リスナーを解除
      unsubscribe();

      // 状態を変更してもリスナーは呼ばれない
      setNetworkState(false);

      expect(listener).not.toHaveBeenCalled();
    });

    it('オンライン復帰時にリスナーが呼ばれる', () => {
      const listener = jest.fn();

      // まずオフラインに
      setNetworkState(false);

      addNetworkStateListener(listener);

      // オンラインに復帰
      setNetworkState(true);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isConnected: true })
      );
    });
  });

  describe('updateNetworkStateFromRequest', () => {
    it('リクエスト成功時はオンライン状態になる', () => {
      // まずオフラインに設定
      setNetworkState(false);

      // リクエスト成功
      updateNetworkStateFromRequest(true);

      expect(isOnline()).toBe(true);
    });

    it('ネットワークエラー時はオフライン状態になる', () => {
      const networkError = new Error('Network request failed');

      updateNetworkStateFromRequest(false, networkError);

      expect(isOffline()).toBe(true);
    });

    it('connectionエラー時はオフライン状態になる', () => {
      const connectionError = new Error('Connection timeout');

      updateNetworkStateFromRequest(false, connectionError);

      expect(isOffline()).toBe(true);
    });

    it('timeoutエラー時はオフライン状態になる', () => {
      const timeoutError = new Error('Request timeout exceeded');

      updateNetworkStateFromRequest(false, timeoutError);

      expect(isOffline()).toBe(true);
    });

    it('fetchエラー時はオフライン状態になる', () => {
      const fetchError = new Error('fetch failed');

      updateNetworkStateFromRequest(false, fetchError);

      expect(isOffline()).toBe(true);
    });

    it('非ネットワークエラーでは状態が変わらない', () => {
      const validationError = new Error('Validation failed: invalid input');

      updateNetworkStateFromRequest(false, validationError);

      // デフォルトのオンライン状態のまま
      expect(isOnline()).toBe(true);
    });

    it('エラーなしの失敗では状態が変わらない', () => {
      updateNetworkStateFromRequest(false);

      // デフォルトのオンライン状態のまま
      expect(isOnline()).toBe(true);
    });
  });

  describe('resetNetworkState', () => {
    it('状態をデフォルトにリセットする', () => {
      // 状態を変更
      setNetworkState(false, 'none');

      // リセット
      resetNetworkState();

      const state = getNetworkState();
      expect(state.isConnected).toBe(true);
      expect(state.connectionType).toBe('unknown');
    });

    it('リスナーもクリアされる', () => {
      const listener = jest.fn();
      addNetworkStateListener(listener);

      // リセット
      resetNetworkState();

      // 状態を変更してもリスナーは呼ばれない
      setNetworkState(false);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
