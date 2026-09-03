/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FAFAF7',
          surface: '#F1F0EA',
          border: '#E3E1D9',
        },
        ink: {
          DEFAULT: '#1F2320',
          soft: '#5B5D57',
        },
        pine: {
          50: '#E4EEE9',
          400: '#6FA88F',
          500: '#3E7361',
          600: '#2F5D50',
          700: '#254A40',
        },
        night: {
          DEFAULT: '#1B1D1B',
          surface: '#232522',
          border: '#33352F',
        },
        mist: {
          DEFAULT: '#EDEDE7',
          soft: '#A3A69C',
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
