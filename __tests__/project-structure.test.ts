/**
 * プロジェクト構造の検証テスト
 * タスク 1.1: モノレポ構成とExpoプロジェクト初期化
 */

import fs from 'fs';
import path from 'path';

describe('Project Structure', () => {
  const rootDir = path.resolve(__dirname, '..');

  test('mobile/ ディレクトリが存在する', () => {
    const mobilePath = path.join(rootDir, 'mobile');
    expect(fs.existsSync(mobilePath)).toBe(true);
    expect(fs.statSync(mobilePath).isDirectory()).toBe(true);
  });

  test('backend/ ディレクトリが存在する', () => {
    const backendPath = path.join(rootDir, 'backend');
    expect(fs.existsSync(backendPath)).toBe(true);
    expect(fs.statSync(backendPath).isDirectory()).toBe(true);
  });

  test('mobile/package.json に Expo SDK 53以降の依存関係がある', () => {
    const packageJsonPath = path.join(rootDir, 'mobile', 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    expect(packageJson.dependencies).toBeDefined();
    expect(packageJson.dependencies.expo).toBeDefined();

    // Expo SDK 53以降をチェック
    const expoVersion = packageJson.dependencies.expo;
    const versionMatch = expoVersion.match(/\d+/);
    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[0], 10);
      expect(majorVersion).toBeGreaterThanOrEqual(53);
    }
  });

  test('mobile/tsconfig.json が存在し、厳密な型チェックが有効', () => {
    const tsconfigPath = path.join(rootDir, 'mobile', 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  test('.gitignore に環境変数ファイルが含まれている', () => {
    const gitignorePath = path.join(rootDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    expect(gitignoreContent).toMatch(/\.env/);
  });

  test('ESLint 設定ファイルが存在する', () => {
    const eslintConfigPath = path.join(rootDir, '.eslintrc.js');
    const eslintConfigJsonPath = path.join(rootDir, '.eslintrc.json');

    const hasEslintConfig = fs.existsSync(eslintConfigPath) || fs.existsSync(eslintConfigJsonPath);
    expect(hasEslintConfig).toBe(true);
  });

  test('Prettier 設定ファイルが存在する', () => {
    const prettierConfigPath = path.join(rootDir, '.prettierrc');
    const prettierConfigJsonPath = path.join(rootDir, '.prettierrc.json');
    const prettierConfigJsPath = path.join(rootDir, '.prettierrc.js');

    const hasPrettierConfig =
      fs.existsSync(prettierConfigPath) ||
      fs.existsSync(prettierConfigJsonPath) ||
      fs.existsSync(prettierConfigJsPath);
    expect(hasPrettierConfig).toBe(true);
  });
});
