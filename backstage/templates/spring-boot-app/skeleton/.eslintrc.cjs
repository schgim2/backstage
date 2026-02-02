module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
{% if values.useTypeScript %}
    '@typescript-eslint/recommended',
{% endif %}
    'plugin:react-hooks/recommended',
  ],
{% if values.useTypeScript %}
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
{% endif %}
  plugins: [{% if values.useTypeScript %}'@typescript-eslint', {% endif %}'react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
{% if values.useTypeScript %}
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
{% else %}
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
{% endif %}
  },
}