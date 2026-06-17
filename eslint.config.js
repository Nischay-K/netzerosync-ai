import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default defineConfig([
  globalIgnores(['dist', 'server/dist', 'coverage']),
  {
    // Apply React/Browser/TS settings to src
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      globals: globals.browser,
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
    },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
    }
  },
  {
    // Node environment for server files
    files: ['server/**/*.{js,ts}'],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tsParser,
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off'
    }
  },
  {
    // Test environment for src/**/*.test.ts/tsx and server/**/*.test.ts
    files: ['src/**/*.test.{ts,tsx,js,jsx}', 'server/**/*.test.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.node,
        ...globals.browser,
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    extends: [
      js.configs.recommended,
    ],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off'
    }
  },
])
