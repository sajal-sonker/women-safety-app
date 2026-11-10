import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  {ignores:['**/src/generated/**','**/.next/**','**/node_modules/**']},
  js.configs.recommended,
  ...ts.configs.recommended,
  {files:['**/*.{ts,tsx,js,mjs}'], languageOptions:{globals:{process:'readonly',console:'readonly',Buffer:'readonly',URL:'readonly',fetch:'readonly',setTimeout:'readonly',setInterval:'readonly',clearInterval:'readonly',AbortSignal:'readonly'}},rules:{'@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}}
);
