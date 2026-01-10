-- Migration: Create Row Level Security (RLS) policies
-- Description: RLSポリシーを設定。読み取りは全員許可、書き込みはservice_role keyのみ
-- Reference: https://supabase.com/docs/guides/auth/row-level-security

-- ============================================
-- Row Level Security (RLS) 設計方針
-- ============================================
-- 
-- このアプリケーションでは認証機能を使用しないため、シンプルなRLSポリシーを採用:
-- - SELECT（読み取り）: anon keyで全レコードにアクセス可能
-- - INSERT/UPDATE/DELETE（書き込み）: service_role keyのみ可能（RLSバイパス）
--
-- service_role keyはバックエンド（Vercel Serverless Functions）でのみ使用し、
-- フロントエンド（React Native）からは直接書き込みを行わない
-- ============================================

-- newsテーブルのRLS
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー: 全てのユーザー（anon key含む）が全レコードを読み取り可能
CREATE POLICY "news_select_all" ON news
  FOR SELECT
  USING (true);

-- コメント
COMMENT ON POLICY "news_select_all" ON news IS 'Allow all users to read news data';

-- ============================================

-- termsテーブルのRLS
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー: 全てのユーザーが全レコードを読み取り可能
CREATE POLICY "terms_select_all" ON terms
  FOR SELECT
  USING (true);

-- コメント
COMMENT ON POLICY "terms_select_all" ON terms IS 'Allow all users to read terms data';

-- ============================================

-- terms_historyテーブルのRLS
ALTER TABLE terms_history ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー: 全てのユーザーが全レコードを読み取り可能
CREATE POLICY "terms_history_select_all" ON terms_history
  FOR SELECT
  USING (true);

-- コメント
COMMENT ON POLICY "terms_history_select_all" ON terms_history IS 'Allow all users to read terms history data';

-- ============================================

-- batch_metadataテーブルのRLS
ALTER TABLE batch_metadata ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー: 全てのユーザーが全レコードを読み取り可能
CREATE POLICY "batch_metadata_select_all" ON batch_metadata
  FOR SELECT
  USING (true);

-- コメント
COMMENT ON POLICY "batch_metadata_select_all" ON batch_metadata IS 'Allow all users to read batch metadata';
