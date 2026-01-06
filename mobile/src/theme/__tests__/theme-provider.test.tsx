/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * テーマプロバイダーのテスト
 *
 * ThemeProviderがReact Contextを通じてテーマ情報を提供し、
 * システムのカラースキームに応じて自動的にテーマを切り替えることを検証する。
 *
 * @see Requirements: 6.5 (ダークモード・ライトモード対応)
 */

import React from 'react';
import { render, renderHook } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useTheme, useThemeColors } from '../index';
import type { ThemeColors } from '../types';

/**
 * テスト用のラッパーコンポーネント
 * ThemeProviderでラップしてテスト対象を提供
 */
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeProvider', () => {
  describe('初期化', () => {
    it('子コンポーネントを正しくレンダリングする', () => {
      const { getByText } = render(
        <ThemeProvider>
          <Text>Test Child</Text>
        </ThemeProvider>
      );

      expect(getByText('Test Child')).toBeTruthy();
    });

    it('プロバイダー初期化時にエラーが発生しない', () => {
      expect(() => {
        render(
          <ThemeProvider>
            <Text>Test</Text>
          </ThemeProvider>
        );
      }).not.toThrow();
    });
  });

  describe('useTheme フック', () => {
    it('modeプロパティを返す', () => {
      const { result } = renderHook(() => useTheme(), { wrapper: TestWrapper });

      // modeは'light'または'dark'のいずれか
      expect(['light', 'dark']).toContain(result.current.mode);
    });

    it('isDarkプロパティを返す', () => {
      const { result } = renderHook(() => useTheme(), { wrapper: TestWrapper });

      // isDarkはboolean
      expect(typeof result.current.isDark).toBe('boolean');
      // isDarkはmodeと整合性がある
      expect(result.current.isDark).toBe(result.current.mode === 'dark');
    });

    it('colorsオブジェクトを返す', () => {
      const { result } = renderHook(() => useTheme(), { wrapper: TestWrapper });

      expect(result.current.colors).toBeDefined();
      expect(typeof result.current.colors.background).toBe('string');
      expect(typeof result.current.colors.text).toBe('string');
    });

    it('ThemeProvider外で使用するとエラーをスローする', () => {
      // エラーをキャッチするためのコンソール抑制
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('useThemeColors フック', () => {
    it('色定義オブジェクトを返す', () => {
      const { result } = renderHook(() => useThemeColors(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(typeof result.current.background).toBe('string');
      expect(typeof result.current.text).toBe('string');
    });

    it('useThemeのcolorsと同じ値を返す', () => {
      const { result: themeResult } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });
      const { result: colorsResult } = renderHook(() => useThemeColors(), {
        wrapper: TestWrapper,
      });

      expect(colorsResult.current).toEqual(themeResult.current.colors);
    });
  });

  describe('色定義の完全性', () => {
    it('すべての必須色プロパティが定義されている', () => {
      const { result } = renderHook(() => useThemeColors(), {
        wrapper: TestWrapper,
      });

      // 必須の色プロパティをチェック
      const requiredColorKeys: (keyof ThemeColors)[] = [
        'background',
        'backgroundSecondary',
        'text',
        'textSecondary',
        'primary',
        'primaryText',
        'card',
        'cardBorder',
        'border',
        'tabBarBackground',
        'tabBarActive',
        'tabBarInactive',
        'headerBackground',
        'headerText',
        'error',
        'errorText',
      ];

      requiredColorKeys.forEach((key) => {
        expect(result.current[key]).toBeDefined();
        expect(typeof result.current[key]).toBe('string');
        // 色は#で始まるHEX形式
        expect(result.current[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('テーマ色の整合性', () => {
    it('ライトモードとダークモードで異なる色が設定されている', () => {
      // 直接色定義をインポートしてテスト
      const { lightColors, darkColors } = require('../colors');

      // 背景色が異なることを確認
      expect(lightColors.background).not.toBe(darkColors.background);
      // テキスト色が異なることを確認
      expect(lightColors.text).not.toBe(darkColors.text);
    });

    it('ライトモードの背景色は明るい色である', () => {
      const { lightColors } = require('../colors');

      // gray-50 (#f9fafb) は明るい色
      expect(lightColors.background).toBe('#f9fafb');
    });

    it('ダークモードの背景色は暗い色である', () => {
      const { darkColors } = require('../colors');

      // gray-900 (#111827) は暗い色
      expect(darkColors.background).toBe('#111827');
    });
  });

  describe('getThemeColors関数', () => {
    it('isDark=falseの場合、ライトモードの色を返す', () => {
      const { getThemeColors, lightColors } = require('../colors');

      const colors = getThemeColors(false);

      expect(colors).toEqual(lightColors);
    });

    it('isDark=trueの場合、ダークモードの色を返す', () => {
      const { getThemeColors, darkColors } = require('../colors');

      const colors = getThemeColors(true);

      expect(colors).toEqual(darkColors);
    });
  });
});
