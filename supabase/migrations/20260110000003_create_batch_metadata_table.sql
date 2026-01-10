-- Migration: Create batch_metadata table
-- Description: バッチ処理のメタデータを保存。キャッシュ無効化の判定に使用
-- Reference: https://supabase.com/docs/guides/database/tables

-- batch_metadataテーブル: バッチ処理の最終更新日時を保存
-- フロントエンドがキャッシュを更新すべきかを判定するために使用
-- シングルトンテーブル（id=1の1レコードのみ）
CREATE TABLE IF NOT EXISTS batch_metadata (
  -- 固定値1のみ許可（シングルトンパターン）
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  
  -- ニュースバッチの最終実行日時
  news_last_updated TIMESTAMPTZ,
  
  -- 用語バッチの最終実行日時
  terms_last_updated TIMESTAMPTZ
);

-- 初期レコードを挿入（シングルトンテーブルの初期化）
-- ON CONFLICT DO NOTHINGで既存レコードがあれば何もしない
INSERT INTO batch_metadata (id) VALUES (1) ON CONFLICT DO NOTHING;

-- コメント: テーブルの用途を記載
COMMENT ON TABLE batch_metadata IS 'Singleton table storing batch processing metadata for cache invalidation';
COMMENT ON COLUMN batch_metadata.id IS 'Fixed value 1 (singleton pattern)';
COMMENT ON COLUMN batch_metadata.news_last_updated IS 'Timestamp of last successful news batch execution';
COMMENT ON COLUMN batch_metadata.terms_last_updated IS 'Timestamp of last successful terms batch execution';
