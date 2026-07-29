/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'rgb(var(--bg-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--bg-secondary-rgb) / <alpha-value>)',
          tertiary: 'rgb(var(--bg-tertiary-rgb) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
        },
        accent: {
          primary: 'rgb(var(--accent-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--accent-secondary-rgb) / <alpha-value>)',
        }
      },
      backgroundImage: {
        'accent-gradient': 'var(--accent-gradient)',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
