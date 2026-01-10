/**
 * Supabase Migrations Test
 * 
 * マイグレーションファイルの構文と内容を検証するテスト
 * 実際のデータベース接続なしでSQLの妥当性を確認
 */

import * as fs from 'fs';
import * as path from 'path';

// マイグレーションディレクトリのパス
const MIGRATIONS_DIR = path.join(__dirname, '../../supabase/migrations');

// 期待されるマイグレーションファイル
const EXPECTED_MIGRATIONS = [
  '20260110000000_create_news_table.sql',
  '20260110000001_create_terms_table.sql',
  '20260110000002_create_terms_history_table.sql',
  '20260110000003_create_batch_metadata_table.sql',
  '20260110000004_create_rls_policies.sql',
];

describe('Supabase Migrations', () => {
  describe('Migration Files Existence', () => {
    test('migrations directory exists', () => {
      expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    });

    test.each(EXPECTED_MIGRATIONS)(
      'migration file %s exists',
      (filename) => {
        const filePath = path.join(MIGRATIONS_DIR, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    );
  });

  describe('Migration File Content', () => {
    test('news table migration contains required elements', () => {
      const content = fs.readFileSync(
        path.join(MIGRATIONS_DIR, '20260110000000_create_news_table.sql'),
        'utf-8'
      );

      // テーブル作成
      expect(content).toContain('CREATE TABLE');
      expect(content).toContain('news');

      // 必須カラム
      expect(content).toContain('date DATE PRIMARY KEY');
      expect(content).toContain('world_news_title TEXT NOT NULL');
      expect(content).toContain('world_news_summary TEXT NOT NULL');
      expect(content).toContain('japan_news_title TEXT NOT NULL');
      expect(content).toContain('japan_news_summary TEXT NOT NULL');
      expect(content).toContain('created_at TIMESTAMPTZ');
      expect(content).toContain('updated_at TIMESTAMPTZ');

      // インデックス
      expect(content).toContain('CREATE INDEX');
      expect(content).toContain('idx_news_date');
    });

    test('terms table migration contains required elements', () => {
      const content = fs.readFileSync(
        path.join(MIGRATIONS_DIR, '20260110000001_create_terms_table.sql'),
        'utf-8'
      );

      // テーブル作成
      expect(content).toContain('CREATE TABLE');
      expect(content).toContain('terms');

      // 必須カラム
      expect(content).toContain('id SERIAL PRIMARY KEY');
      expect(content).toContain('date DATE NOT NULL');
      expect(content).toContain('name TEXT NOT NULL');
      expect(content).toContain('description TEXT NOT NULL');
      expect(content).toContain('difficulty TEXT NOT NULL');

      // CHECK制約
      expect(content).toContain("CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))");

      // インデックス
      expect(content).toContain('CREATE INDEX');
      expect(content).toContain('idx_terms_date');
    });

    test('terms_history table migration contains required elements', () => {
      const content = fs.readFileSync(
        path.join(MIGRATIONS_DIR, '20260110000002_create_terms_history_table.sql'),
        'utf-8'
      );

      // テーブル作成
      expect(content).toContain('CREATE TABLE');
      expect(content).toContain('terms_history');

      // 必須カラム
      expect(content).toContain('id SERIAL PRIMARY KEY');
      expect(content).toContain('term_name TEXT NOT NULL');
      expect(content).toContain('delivered_at TIMESTAMPTZ');
      expect(content).toContain('difficulty TEXT NOT NULL');

      // CHECK制約
      expect(content).toContain("CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))");

      // インデックス
      expect(content).toContain('idx_terms_history_delivered_at');
      expect(content).toContain('idx_terms_history_term_name');
    });

    test('batch_metadata table migration contains required elements', () => {
      const content = fs.readFileSync(
        path.join(MIGRATIONS_DIR, '20260110000003_create_batch_metadata_table.sql'),
        'utf-8'
      );

      // テーブル作成
      expect(content).toContain('CREATE TABLE');
      expect(content).toContain('batch_metadata');

      // シングルトンパターンの制約
      expect(content).toContain('id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1)');

      // 必須カラム
      expect(content).toContain('news_last_updated TIMESTAMPTZ');
      expect(content).toContain('terms_last_updated TIMESTAMPTZ');

      // 初期レコード挿入
      expect(content).toContain('INSERT INTO batch_metadata');
      expect(content).toContain('ON CONFLICT DO NOTHING');
    });

    test('RLS policies migration contains required elements', () => {
      const content = fs.readFileSync(
        path.join(MIGRATIONS_DIR, '20260110000004_create_rls_policies.sql'),
        'utf-8'
      );

      // RLS有効化
      expect(content).toContain('ENABLE ROW LEVEL SECURITY');

      // 各テーブルのRLS設定
      const tables = ['news', 'terms', 'terms_history', 'batch_metadata'];
      tables.forEach((table) => {
        expect(content).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
        expect(content).toContain(`CREATE POLICY "${table}_select_all"`);
        expect(content).toContain('FOR SELECT');
        expect(content).toContain('USING (true)');
      });
    });
  });

  describe('Seed File', () => {
    const SEED_FILE = path.join(__dirname, '../../supabase/seed.sql');

    test('seed file exists', () => {
      expect(fs.existsSync(SEED_FILE)).toBe(true);
    });

    test('seed file contains test data for all tables', () => {
      const content = fs.readFileSync(SEED_FILE, 'utf-8');

      // newsテーブルのシードデータ
      expect(content).toContain('INSERT INTO news');

      // termsテーブルのシードデータ
      expect(content).toContain('INSERT INTO terms');

      // terms_historyテーブルのシードデータ
      expect(content).toContain('INSERT INTO terms_history');

      // batch_metadataの更新
      expect(content).toContain('UPDATE batch_metadata');
    });
  });

  describe('Config File', () => {
    const CONFIG_FILE = path.join(__dirname, '../../supabase/config.toml');

    test('config file exists', () => {
      expect(fs.existsSync(CONFIG_FILE)).toBe(true);
    });

    test('config file contains project settings', () => {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');

      // プロジェクトID
      expect(content).toContain('project_id');
      expect(content).toContain('invest-learning-app');

      // API設定
      expect(content).toContain('[api]');
      expect(content).toContain('port = 54321');

      // DB設定
      expect(content).toContain('[db]');
      expect(content).toContain('port = 54322');

      // Studio設定
      expect(content).toContain('[studio]');
      expect(content).toContain('port = 54323');
    });
  });
});

describe('Makefile', () => {
  const MAKEFILE = path.join(__dirname, '../../Makefile');

  test('Makefile exists', () => {
    expect(fs.existsSync(MAKEFILE)).toBe(true);
  });

  test('Makefile contains required targets', () => {
    const content = fs.readFileSync(MAKEFILE, 'utf-8');

    // Supabaseコマンド
    expect(content).toContain('supabase-start:');
    expect(content).toContain('supabase-stop:');
    expect(content).toContain('supabase-reset:');
    expect(content).toContain('supabase-status:');

    // データベースコマンド
    expect(content).toContain('db-migrate:');
    expect(content).toContain('db-seed:');
    expect(content).toContain('db-push:');

    // 開発コマンド
    expect(content).toContain('backend-dev:');
    expect(content).toContain('mobile-dev:');
    expect(content).toContain('test:');

    // デプロイコマンド
    expect(content).toContain('deploy:');
  });
});
