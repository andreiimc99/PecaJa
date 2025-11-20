/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/app/**/*.{js,ts,jsx,tsx}',
		'./src/components/**/*.{js,ts,jsx,tsx}',
		'./src/**/*.{js,ts,jsx,tsx}',
		'./**/*.{html,js,ts,jsx,tsx}'
	],
	theme: {
		extend: {
			colors: {
				brand: '#f55404',
				'brand-dark': '#c34303'
			}
		}
	},
	plugins: [
		require('@tailwindcss/forms')
	],
}

