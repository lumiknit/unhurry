// @ts-check
// eslint.config.mjs

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import-x';
import unusedImports from 'eslint-plugin-unused-imports';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

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
			'import-x/resolver-next': [
				createTypeScriptImportResolver({
					alwaysTryTypes: true,
					project: ['./tsconfig.json', './tsconfig.app.json'],
				}),
			],
		},
		rules: {
			'import-x/no-cycle': 'error',
			'no-console': 'off',
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'import-x/order': [
				'error',
				{
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
					pathGroups: [
						{
							pattern: '@/**',
							group: 'internal',
							position: 'before',
						},
						{
							pattern: '@components/**',
							group: 'internal',
							position: 'before',
						},
						{
							pattern: '@lib/**',
							group: 'internal',
							position: 'before',
						},
						{
							pattern: '@store',
							group: 'internal',
							position: 'before',
						},
						{
							pattern: '@store/**',
							group: 'internal',
							position: 'before',
						},
					],
					groups: [
						'builtin',
						'external',
						'internal',
						['sibling', 'parent', 'index'],
					],
					'newlines-between': 'always',
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
