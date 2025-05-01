const js = require("@eslint/js");
const typescriptParser = require("@typescript-eslint/parser");
const typescriptPlugin = require("@typescript-eslint/eslint-plugin");
const globals = require("globals"); // Import globals

// FlatCompat is not currently needed
// const { FlatCompat } = require("@eslint/eslintrc"); 
// const compat = new FlatCompat();

module.exports = [
  // Global ignores
  { 
    ignores: ["dist/**"]
  },
  // Global language options and recommended JS rules
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.node, // Add node globals
        ...globals.es2021, // Use es2021 for modern ES features
      }
    },
    rules: {
       ...js.configs.recommended.rules,
    }
  },
  // TypeScript specific configuration
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn", 
        { 
          "argsIgnorePattern": "^_", // Ignore args starting with _
          "varsIgnorePattern": "^_", // Ignore variables starting with _
          "caughtErrorsIgnorePattern": "^_" // Ignore caught errors starting with _
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Configuration for the ESLint config file itself (CommonJS)
  {
     files: ["eslint.config.cjs"],
     languageOptions: {
       sourceType: "commonjs", // Specify this is CommonJS
       globals: {
         ...globals.node, // Node globals are needed here too
         require: "readonly",
         module: "readonly",
         __dirname: "readonly"
       }
     },
     rules: {
       "no-undef": "error", // Ensure we catch undefined variables in the config
       "no-unused-vars": ["warn", { "varsIgnorePattern": "^_" }] // Ignore unused vars starting with _ in config too
     }
  }
]; 