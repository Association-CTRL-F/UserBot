import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
	{
		ignores: ['node_modules/**', 'coverage/**', 'dist/**'],
	},
	{
		files: ['src/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				console: 'readonly',
				process: 'readonly',
				Buffer: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				fetch: 'readonly',
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
		},
		rules: {
			eqeqeq: 'error',
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-throw-literal': 'error',
			'no-return-await': 'off',
			'no-template-curly-in-string': 'error',
			'no-unreachable': 'error',
			'no-unsafe-finally': 'error',
			'no-unused-expressions': 'error',

			'no-shadow': 'error',
			'no-undef': 'error',
			'no-undef-init': 'error',
			'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
			'no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],

			curly: ['error', 'all'],
			'no-else-return': 'error',
			'no-lonely-if': 'error',
			'no-useless-return': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			'object-shorthand': ['error', 'always'],
			'prefer-template': 'error',

			'no-await-in-loop': 'off',
			'require-await': 'off',

			'max-len': 'off',
			quotes: 'off',
			semi: 'off',
			'comma-dangle': 'off',
			'arrow-parens': 'off',
			'object-curly-spacing': 'off',
			'space-before-function-paren': 'off',
		},
	},
	prettierRecommended,
]
