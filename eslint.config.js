limport prettier from 'eslint-config-prettier';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

/** @type {import('eslint').Linter.Config[]} */ export default [
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } }
	},
		{
		files: ['**/*.svelte', '**/*.svelte.js'],
		languageOptions: { parserOptions: { svelteConfig } },
		rules: {
			'@eslint/js/no-undef': 'off',
			'svelte/no-store-write-in-on-mount': 'off',
			'svelte/no-at-html-tags': 'off',
			'svelte/require-each-key': 'off'
		}
	},
	{
		rules: {
			'no-unused-vars': ['warn', {
				varsIgnorePattern: '^_',
				argsIgnorePattern: '^_',
				destructuredArrayIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}],
			'svelte/no-navigation-without-resolve': 'off'
		}
	}
];