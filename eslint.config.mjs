import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', '**/*.ts', '**/*.tsx']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
