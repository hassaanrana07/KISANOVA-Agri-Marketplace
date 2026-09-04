/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          50: '#f2f9f3',
          100: '#e1f2e4',
          200: '#c4e5cb',
          300: '#97d2a3',
          400: '#64b775',
          500: '#3e9c52',
          600: '#2e7e3f',
          700: '#266434',
          800: '#22502c',
          900: '#1d4226',
          950: '#0b2412',
        },
        earth: {
          50: '#faf7f2',
          100: '#f3ece1',
          200: '#e7d8c2',
          300: '#d7be9d',
          400: '#c5a077',
          500: '#b7875b',
          600: '#aa714e',
          700: '#8d5940',
          800: '#734939',
          900: '#5f3d32',
        }
      }
    },
  },
  plugins: [],
}
