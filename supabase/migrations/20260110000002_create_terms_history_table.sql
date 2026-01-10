-- Migration: Create terms_history table
-- Description: 配信済み用語の履歴を保存。重複配信を防ぐために使用
-- Reference: https://supabase.com/docs/guides/database/tables

-- terms_historyテーブル: 配信済み用語の履歴を保存
-- 新しい用語を生成する際に、過去に配信済みかどうかをチェックするために使用
CREATE TABLE IF NOT EXISTS terms_history (
  -- 自動採番のID
  id SERIAL PRIMARY KEY,
  
  -- 配信された用語名
  term_name TEXT NOT NULL,
  
  -- 配信日時
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 配信時の難易度レベル
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
);

-- 配信日時でのソート・検索を高速化するためのインデックス
-- 履歴検索や重複チェックで使用
CREATE INDEX IF NOT EXISTS idx_terms_history_delivered_at ON terms_history (delivered_at DESC);

-- 用語名での検索を高速化するためのインデックス
-- 重複チェック時に使用
CREATE INDEX IF NOT EXISTS idx_terms_history_term_name ON terms_history (term_name);

-- コメント: テーブルの用途を記載
COMMENT ON TABLE terms_history IS 'History of delivered terms to prevent duplicate delivery';
COMMENT ON COLUMN terms_history.term_name IS 'Name of the delivered term';
COMMENT ON COLUMN terms_history.delivered_at IS 'Timestamp when the term was delivered';
COMMENT ON COLUMN terms_history.difficulty IS 'Difficulty level when delivered';
