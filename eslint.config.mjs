// @ts-check
// eslint.config.mjs

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommended,
	{
		files: ['src/**/*.{js,mjs,cjs,ts,tsx}'],
		extends: [
			importPlugin.flatConfigs.recommended,
			importPlugin.flatConfigs.typescript,
		],
		plugins: {
			'unused-imports': unusedImports,
		},
		settings: {
			'import/resolver': {
				node: true,
				typescript: true,
			},
		},
		rules: {
			'import/no-cycle': 'error',
			'no-console': 'off',
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'import/order': [
				'error',
				{
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
					groups: [
						'builtin',
						'external',
						'internal',
						['sibling', 'parent', 'index'],
					],
					'newlines-between': 'always',
					named: true,
				},
			],
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],
		},
	}
);
