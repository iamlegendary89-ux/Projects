import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // Base configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ========================================================
  // JAVASCRIPT SCRIPTS ENVIRONMENT
  // Config for .js files to avoid TypeScript parsing issues
  // ========================================================
  {
    files: ["scripts/**/*.js", "backup/**/*.js", "**/*.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script", // Allow CommonJS for scripts
      globals: {
        // Node.js globals for scripts
        console: "readonly",
        process: "readonly",
        global: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Build tools
        __webpack_require__: "readonly",
        __non_webpack_require__: "readonly",
        // Additional globals for config files
        jest: "readonly",
        URLSearchParams: "readonly",
        window: "readonly",
      },
    },
    rules: {
      // Error-level rules
      "no-debugger": "error",
      "no-alert": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      "no-duplicate-imports": "error",
      "no-empty-pattern": "error",
      curly: ["error", "all"],
      "brace-style": "off",
      "comma-dangle": ["error", "always-multiline"],
      semi: ["error", "always"],
      quotes: ["error", "double"],
      indent: ["error", 2, { SwitchCase: 1 }],
      "max-len": ["error", { code: 200, ignoreUrls: true }],
      // Relax for scripts
      "no-console": "off",
      "no-undef": "off", // Node.js globals not defined
      "no-redeclare": "off", // Allow redeclare in scripts
    },
  },

  // ========================================================
  // ENTERPRISE PRODUCTION CODE STANDARDS
  // Zero-tolerance quality for production deployment - TypeScript
  // ========================================================
  {
    files: ["scripts/**/*.ts", "backup/**/*.ts", "**/*.config.ts"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        // React and testing globals
        React: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        test: "readonly",
        jest: "readonly",
        // Web APIs
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        Blob: "readonly",
        FormData: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        ReadableStream: "readonly",
        WritableStream: "readonly",
        TransformStream: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        fetch: "readonly",
        console: "readonly",
        process: "readonly",
        global: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      // ========================================================
      // ERROR-LEVEL RULES: Build-breaking violations
      // ========================================================

      // Potential Runtime Errors
      "no-debugger": "error",
      "no-alert": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Code Quality Standards
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      "no-duplicate-imports": "error",
      "no-empty-pattern": "error",
      "@typescript-eslint/explicit-function-return-type": "off", // Allow inferred types

      // Security Standards
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      // Style and Consistency
      curly: ["error", "all"],
      "brace-style": "off",
      "comma-dangle": ["error", "always-multiline"],
      semi: ["error", "always"],
      quotes: ["error", "double"],
      indent: ["error", 2, { SwitchCase: 1 }],
      "max-len": ["error", { code: 120, ignoreUrls: true }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "error",

      // Relaxed for scripts
      "no-console": "off", // Scripts use console logging
      "@typescript-eslint/no-use-before-define": "off", // Functions defined after use
      "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions in scripts
      "@typescript-eslint/no-explicit-any": "off", // Allow any in scripts
      "@typescript-eslint/prefer-nullish-coalescing": "off", // Allow logical or in scripts
      "@typescript-eslint/consistent-type-imports": "off", // Allow type imports
      "@typescript-eslint/no-unused-vars": "off", // Off for unused vars in scripts
      "max-len": "off", // Off for long lines in scripts
      "no-duplicate-imports": "off", // Off for duplicate imports in scripts

      // React-specific rules (for Next.js apps) - disabled for now
      // TODO: Re-enable when app directory is present
      // "react/prop-types": "off", // TypeScript handles this
      // "react/jsx-key": "error",
      // "react/jsx-no-duplicate-props": "error",
      // "react/jsx-no-undef": "error",
      // "react/jsx-uses-react": "error",
      // "react/jsx-uses-vars": "error",
      // "react/no-unused-prop-types": "error",
    },
  },

  // ========================================================
  // TESTING FILES ENVIRONMENT
  // Special rules for test files
  // ========================================================
  {
    files: [
      "tests/**/*.{js,ts,jsx,tsx}",
      "**/*.test.{js,ts,jsx,tsx}",
      "**/*.spec.{js,ts,jsx,tsx}",
      "**/__tests__/**/*.{js,ts,jsx,tsx}",
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        // Jest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
        // Common test utilities
        console: "readonly",
        process: "readonly",
        // Node.js globals for performance tests
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        global: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      // Relaxed rules for tests
      "no-console": "warn", // Allow console.log in tests but as warning
      "@typescript-eslint/no-explicit-any": "warn", // Any is common in test files
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },

  // ========================================================
  // IGNORE PATTERNS
  // Files and directories to completely ignore
  // ========================================================
  {
    ignores: [
      // Build outputs
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",

      // Dependencies
      "node_modules/**",

      // Generated or cache files
      "coverage/**",
      ".cache/**",
      ".temp/**",
      "*.generated.ts",

      // Data files (JSON, logs, etc.)
      "data/**/*.json",
      "cache/**/*",
      "*.log",

      // Build configurations
      "postcss.config.js",
      "tailwind.config.js",
      "next.config.js",
      "jest.config.cjs",
      "jest.setup.js",

      // Legacy backup files
      "backup/**/*.json",
      "scripts/**/*.json",

      // Static assets
      "public/**",

      // JavaScript utility scripts (not part of TypeScript project)
      "scripts/check-esm-compatibility.js",
      "scripts/data-completeness-check.js",
      "scripts/performance-report-generator.js",
      "scripts/test-content-limit.js",

      // LZFOF test utilities (experimental benchmark scripts)
      "scripts/lzfof-*.ts",
      "scripts/lzfof/**/*.ts",
    ],
  },
];
