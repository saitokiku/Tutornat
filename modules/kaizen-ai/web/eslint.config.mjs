// ESLint flat config.
//
// The repo had NO linter at all — `next lint` was in package.json but Next 16
// removed the command, and there was no config or dependency, so the script
// errored rather than running. That gap let a whole class of bug through:
// converting seven API routes to a shared helper left `msg` undefined in every
// one of them, and `next build` compiled it cleanly because bundlers do not do
// undefined-variable analysis.
//
// So the rules below are deliberately narrow and severity-tiered: `no-undef` and
// `no-unused-vars` as ERRORS (they catch real, shipped breakage), style left
// alone. A linter that fails on 400 formatting opinions gets switched off.

import js from '@eslint/js';
import globals from 'globals';
// The codebase carries `eslint-disable-next-line react-hooks/exhaustive-deps`
// comments from before there was a linter. Without the plugin registered those
// comments are themselves errors ("rule not found"), so the plugin is required
// even though the rule is set to warn rather than error.
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      '.next/**', 'node_modules/**', 'out/**', 'public/**',
      'coverage/**', 'playwright-report/**', 'test-results/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.js', '**/*.mjs', '**/*.jsx'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
        React: 'readonly',
      },
    },
    rules: {
      // THE RULE THAT MATTERS. A dangling identifier compiles fine and throws in
      // production; this is the only automated check that catches it.
      'no-undef': 'error',

      // Unused imports are usually the residue of an incomplete refactor — the
      // exact situation that produced the bug above.
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',       // `catch {}` with an ignored error is idiomatic here
        ignoreRestSiblings: true,
      }],

      // Real hazards, not taste.
      'no-const-assign': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'require-atomic-updates': 'off',   // too many false positives on async route handlers

      // Deliberately relaxed: the codebase uses empty catch blocks as a
      // documented "degrade quietly" idiom, and `console` is the server log.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': 'off',

      // Hook dependency correctness is real, but the existing code has
      // deliberate omissions with explanatory disable comments. Warn so new
      // ones are visible without failing the build on legacy decisions.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
    },
  },

  {
    // JSX components reference their own names in the file; the base config
    // cannot see JSX usage without the React plugin, so unused-vars would
    // false-positive on every imported component.
    files: ['**/*.jsx', 'app/**/*.js', 'components/**/*.js'],
    rules: {
      'no-unused-vars': ['error', {
        // PascalCase in BOTH positions: a component destructured from a mapped
        // array is an arg (`FEATURES.map(({ Icon }) => <Icon/>)`), and base
        // ESLint cannot see JSX usage without the react plugin.
        argsIgnorePattern: '^(_|[A-Z])',
        varsIgnorePattern: '^(_|[A-Z])',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
      }],
    },
  },

  {
    files: ['test/**/*.mjs', 'scripts/**/*.mjs', 'e2e/**/*.js', '*.config.js', '*.config.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-unused-vars': 'off' },
  },
];
