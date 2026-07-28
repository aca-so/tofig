import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    // Generated build output, vendored third-party bundles, and dependencies —
    // never lint these.
    // `tmp/` is gitignored scratch space; flat config doesn't read .gitignore.
    // `.claude/` holds installed agent-skill scripts: third-party, not our
    // source, and 143 errors of it. Linting them only ever breaks CI.
    ignores: [
      'code.js', 'ui.html', 'dist/', 'out/', 'lib/',
      'node_modules/', 'src/ui/vendor/', 'tmp/', '.claude/',
    ],
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
    // Puppeteer drivers: Node scripts whose page.evaluate()/waitForFunction()
    // callbacks execute in the browser, so they reference document/window.
    // `bin/` is the renderer CLI; `assets/` is the listing-art and icon
    // renderer. Both need the union of the two global sets.
    files: ['bin/**/*.mjs', 'assets/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    // Marketing site (tofig.aca.so). Plain browser scripts, no bundler —
    // the `**/*.js` block above would otherwise hand these Node globals and
    // trip no-undef on document/window.
    files: ['site/**/*.js'],
    languageOptions: {
      globals: globals.browser,
      sourceType: 'script',
    },
  },
);
