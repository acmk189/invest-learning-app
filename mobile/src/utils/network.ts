/**
 * ネットワーク状態検出ユーティリティ
 * Task 11.3: ネットワーク状態検出実装
 *
 * オンライン/オフライン状態を検出し、
 * オフライン時のキャッシュフォールバックをサポートします。
 *
 * Requirements:
 * - 10.2: ネットワーク状態の検出機能を実装する
 * - 10.3: オフライン時はキャッシュからデータを取得する
 *
 * @see https://docs.expo.dev/versions/latest/sdk/netinfo/
 */

/**
 * ネットワーク接続状態
 */
export interface NetworkState {
  /** インターネットに接続されているか */
  isConnected: boolean;
  /** 接続タイプ (wifi, cellular, none等) */
  connectionType: string;
}

/**
 * ネットワーク状態のリスナー
 */
export type NetworkStateListener = (state: NetworkState) => void;

/**
 * デフォルトのネットワーク状態 (オンラインと仮定)
 */
const DEFAULT_NETWORK_STATE: NetworkState = {
  isConnected: true,
  connectionType: 'unknown',
};

// 現在のネットワーク状態を保持
let currentNetworkState: NetworkState = DEFAULT_NETWORK_STATE;

// リスナーのセット
const listeners: Set<NetworkStateListener> = new Set();

/**
 * ネットワーク状態を更新する (内部用)
 * @param state - 新しいネットワーク状態
 */
function updateNetworkState(state: NetworkState): void {
  const previousState = currentNetworkState;
  currentNetworkState = state;

  // 状態が変わった場合のみリスナーに通知
  if (previousState.isConnected !== state.isConnected) {
    console.log(`[Network] Connection state changed: ${state.isConnected ? 'Online' : 'Offline'}`);
    listeners.forEach((listener) => listener(state));
  }
}

/**
 * 現在のネットワーク状態を取得する
 *
 * @returns 現在のネットワーク状態
 *
 * @example
 * ```typescript
 * const state = getNetworkState();
 * if (state.isConnected) {
 *   // オンライン処理
 * } else {
 *   // オフライン処理(キャッシュ使用)
 * }
 * ```
 */
export function getNetworkState(): NetworkState {
  return { ...currentNetworkState };
}

/**
 * オンライン状態かどうかを確認する
 *
 * @returns オンラインの場合true
 *
 * @example
 * ```typescript
 * if (isOnline()) {
 *   await fetchFromSupabase();
 * } else {
 *   return getCachedData();
 * }
 * ```
 */
export function isOnline(): boolean {
  return currentNetworkState.isConnected;
}

/**
 * オフライン状態かどうかを確認する
 *
 * @returns オフラインの場合true
 */
export function isOffline(): boolean {
  return !currentNetworkState.isConnected;
}

/**
 * ネットワーク状態変更のリスナーを登録する
 *
 * @param listener - 状態変更時に呼ばれるコールバック
 * @returns リスナーを解除する関数
 *
 * @example
 * ```typescript
 * const unsubscribe = addNetworkStateListener((state) => {
 *   if (state.isConnected) {
 *     console.log('オンラインに復帰しました');
 *     refreshData();
 *   }
 * });
 *
 * // クリーンアップ時
 * unsubscribe();
 * ```
 */
export function addNetworkStateListener(listener: NetworkStateListener): () => void {
  listeners.add(listener);

  // 登録解除関数を返す
  return () => {
    listeners.delete(listener);
  };
}

/**
 * ネットワーク状態を手動で設定する (テスト用)
 *
 * @param isConnected - 接続状態
 * @param connectionType - 接続タイプ
 */
export function setNetworkState(isConnected: boolean, connectionType: string = 'unknown'): void {
  updateNetworkState({ isConnected, connectionType });
}

/**
 * ネットワーク状態をリセットする (テスト用)
 */
export function resetNetworkState(): void {
  currentNetworkState = DEFAULT_NETWORK_STATE;
  listeners.clear();
}

/**
 * ネットワーク状態モニタリングを開始する
 *
 * 注意: このシンプルな実装では、実際のネットワークイベントを
 * 検出するにはNetInfoライブラリが必要です。
 * 現在の実装ではSupabaseリクエストの成功/失敗で状態を推測します。
 */
export function startNetworkMonitoring(): void {
  console.log('[Network] Network monitoring started (lightweight mode)');
  // 軽量モード: Supabaseリクエストの結果で状態を更新
  // 将来的にNetInfoライブラリを導入する場合はここで購読を開始
}

/**
 * ネットワーク状態モニタリングを停止する
 */
export function stopNetworkMonitoring(): void {
  console.log('[Network] Network monitoring stopped');
  listeners.clear();
}

/**
 * Supabaseリクエスト結果からネットワーク状態を更新する
 *
 * リクエストが成功した場合はオンライン状態に、
 * ネットワークエラーの場合はオフライン状態に設定します。
 *
 * @param success - リクエストが成功したか
 * @param error - エラー(失敗時)
 */
export function updateNetworkStateFromRequest(success: boolean, error?: Error): void {
  if (success) {
    // リクエスト成功 → オンライン
    updateNetworkState({ isConnected: true, connectionType: 'unknown' });
  } else if (error) {
    // ネットワークエラーかどうかを判定
    const message = error.message.toLowerCase();
    const isNetworkError =
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('fetch');

    if (isNetworkError) {
      updateNetworkState({ isConnected: false, connectionType: 'none' });
    }
  }
}
