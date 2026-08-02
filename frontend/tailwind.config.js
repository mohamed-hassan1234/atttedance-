/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ledger: {
          950: '#0B1220',
          900: '#111C33',
          800: '#16223F',
          700: '#1E2C4D',
          600: '#2B3E68',
          400: '#6B7FA8',
          200: '#C7D0E4',
          100: '#EDF1F9',
          50: '#F7F8FB',
        },
        seal: {
          DEFAULT: '#B8862E',
          light: '#D6A64B',
          dark: '#8C6420',
        },
        eligible: '#1E7A4C',
        ineligible: '#B33A3A',
        pending: '#C08A1E',
      },
      fontFamily: {
        display: ['"Newsreader"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,18,32,0.06), 0 8px 24px -12px rgba(11,18,32,0.18)',
      },
    },
  },
  plugins: [],
};
