import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    // Generated build output and dependencies — never lint these.
    ignores: ['code.js', 'ui.html', 'dist/', 'out/', 'lib/', 'node_modules/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Plugin/UI source. The UI side runs in a browser iframe; the plugin side
    // runs in the Figma sandbox. Allow both global sets so no-undef stays quiet.
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        figma: 'readonly',
        __html__: 'readonly',
      },
    },
    rules: {
      // The capture pipeline bridges an untyped third-party lib
      // (@builder.io/html-to-figma), dynamic postMessage payloads, and Figma
      // node manipulation. Keep `any` visible as a warning rather than blocking.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Build/config scripts run in Node.
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // The renderer CLI runs in Node, but its page.evaluate()/waitForFunction()
    // callbacks execute in the browser — they reference document/window.
    files: ['bin/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
