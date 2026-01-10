# ============================================
# invest-learning-app Makefile
# ============================================
# 
# ローカル開発環境のコマンドを集約するMakefile
# Reference: https://supabase.com/docs/reference/cli
#
# 使用方法:
#   make help          - 利用可能なコマンド一覧を表示
#   make supabase-start - ローカルSupabaseを起動
#
# ============================================

.PHONY: help \
        supabase-start supabase-stop supabase-reset supabase-status supabase-logs \
        db-migrate db-seed db-push db-diff db-studio \
        backend-dev backend-test backend-lint \
        mobile-dev mobile-test mobile-lint \
        test lint deploy

# デフォルトターゲット: ヘルプを表示
.DEFAULT_GOAL := help

# ============================================
# Help
# ============================================

help:
	@echo ""
	@echo "invest-learning-app Development Commands"
	@echo "=========================================="
	@echo ""
	@echo "Supabase (ローカル開発環境):"
	@echo "  make supabase-start   - ローカルSupabaseをDockerで起動"
	@echo "  make supabase-stop    - ローカルSupabaseを停止"
	@echo "  make supabase-reset   - データベースをリセット（マイグレーション再適用）"
	@echo "  make supabase-status  - Supabaseスタックの状態を確認"
	@echo "  make supabase-logs    - Supabaseログを表示"
	@echo ""
	@echo "Database (データベース操作):"
	@echo "  make db-migrate       - 新しいマイグレーションファイルを作成"
	@echo "  make db-seed          - シードデータを投入"
	@echo "  make db-push          - 本番DBにマイグレーションを適用"
	@echo "  make db-diff          - スキーマの差分を確認"
	@echo "  make db-studio        - Supabase Studioを開く"
	@echo ""
	@echo "Backend (バックエンド開発):"
	@echo "  make backend-dev      - バックエンド開発サーバーを起動"
	@echo "  make backend-test     - バックエンドのテストを実行"
	@echo "  make backend-lint     - バックエンドのリントを実行"
	@echo ""
	@echo "Mobile (モバイルアプリ開発):"
	@echo "  make mobile-dev       - Expo開発サーバーを起動"
	@echo "  make mobile-test      - モバイルのテストを実行"
	@echo "  make mobile-lint      - モバイルのリントを実行"
	@echo ""
	@echo "All (全体操作):"
	@echo "  make test             - 全てのテストを実行"
	@echo "  make lint             - 全てのリントを実行"
	@echo "  make deploy           - 本番環境にデプロイ"
	@echo ""

# ============================================
# Supabase Commands
# ============================================

# ローカルSupabaseを起動（Docker必須）
# 起動後、API URL、anon key、service_role keyが表示される
supabase-start:
	@echo "Starting local Supabase..."
	@echo "Note: Docker must be running"
	supabase start

# ローカルSupabaseを停止
supabase-stop:
	@echo "Stopping local Supabase..."
	supabase stop

# データベースをリセット（マイグレーション再適用 + シードデータ投入）
supabase-reset:
	@echo "Resetting local database..."
	supabase db reset

# Supabaseスタックの状態を確認
supabase-status:
	supabase status

# Supabaseのログを表示（リアルタイム）
supabase-logs:
	supabase db logs --follow

# ============================================
# Database Commands
# ============================================

# 新しいマイグレーションファイルを作成
# 使用例: make db-migrate name=add_user_table
db-migrate:
ifndef name
	@echo "Error: Migration name is required"
	@echo "Usage: make db-migrate name=your_migration_name"
	@exit 1
endif
	supabase migration new $(name)

# シードデータのみを投入（マイグレーションは適用済みの前提）
db-seed:
	@echo "Seeding database..."
	supabase db reset --seed-only

# 本番Supabaseにマイグレーションを適用
# 事前に `supabase link` で本番プロジェクトをリンクしておく必要がある
db-push:
	@echo "Pushing migrations to production..."
	@echo "Note: Run 'supabase link' first to connect to your project"
	supabase db push

# ローカルDBと本番DBのスキーマ差分を確認
db-diff:
	supabase db diff

# Supabase Studioをブラウザで開く（ローカル）
db-studio:
	@echo "Opening Supabase Studio..."
	@echo "URL: http://localhost:54323"
	open http://localhost:54323 || xdg-open http://localhost:54323 || echo "Please open http://localhost:54323 in your browser"

# ============================================
# Backend Commands
# ============================================

# バックエンド開発サーバーを起動
backend-dev:
	cd backend && npm run dev

# バックエンドのテストを実行
backend-test:
	cd backend && npm test

# バックエンドのリントを実行
backend-lint:
	cd backend && npm run lint

# ============================================
# Mobile Commands
# ============================================

# Expo開発サーバーを起動
mobile-dev:
	cd mobile && npx expo start

# モバイルのテストを実行
mobile-test:
	cd mobile && npm test

# モバイルのリントを実行
mobile-lint:
	cd mobile && npm run lint

# ============================================
# All Commands
# ============================================

# 全てのテストを実行
test: backend-test mobile-test
	@echo "All tests completed"

# 全てのリントを実行
lint: backend-lint mobile-lint
	@echo "All lint checks completed"

# 本番環境にデプロイ
# 1. 本番DBにマイグレーション適用
# 2. Vercelにバックエンドをデプロイ
deploy:
	@echo "Deploying to production..."
	@echo ""
	@echo "Step 1: Push database migrations"
	supabase db push --linked
	@echo ""
	@echo "Step 2: Deploy backend to Vercel"
	cd backend && vercel --prod
	@echo ""
	@echo "Deployment completed!"
