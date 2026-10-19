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
          600: '#475569',
          400: '#64748B',
          200: '#CBD5E1',
          100: '#E2E8F0',
          50: '#F5F8FA',
        },
        seal: {
          DEFAULT: '#B8862E',
          light: '#D6A64B',
          dark: '#8C6420',
        },
        eligible: '#138653',
        ineligible: '#B33A3A',
        pending: '#C08A1E',
        // Hormuud University brand palette. "brand" (primary green) and
        // "brand-deep" double as the OCR scanner's accent color; "brand-blue"
        // is the secondary accent (links, info states); "brand-bg" is the
        // light page background used outside the ledger-dark surfaces.
        brand: {
          DEFAULT: '#138653',
          deep: '#087443',
          blue: '#278FC5',
          bg: '#F5F8FA',
          dark: '#17212B',
          muted: '#64748B',
        },
      },
      fontFamily: {
        // Hormuud brand typeface throughout (headings included) — Inter.
        display: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,18,32,0.05)',
      },
    },
  },
  plugins: [],
};
