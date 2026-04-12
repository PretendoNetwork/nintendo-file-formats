import eslintConfig from '@pretendonetwork/eslint-config';

export default [
	...eslintConfig,
	{
		rules: {
			'no-case-declarations': 'off'
		}
	}
];
