/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['react'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'prettier'
  ],
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist', 'node_modules', '**/dist', '**/node_modules'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: require.resolve('@typescript-eslint/parser'),
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'prettier'
      ],
      parserOptions: { project: false }
    }
  ]
}

