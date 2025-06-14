module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // Add any specific rule overrides here if needed
    // For example:
    // '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    // 'no-console': 'warn', // Warn about console.log statements
  },
}; 