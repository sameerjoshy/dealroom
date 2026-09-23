/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A192F',
        ink2: '#0F2444',
        surface: '#F8FAFC',
        line: '#E2E8F0',
        accent: '#10B981',
        accent2: '#0D9488',
        critical: '#DC2626',
        warn: '#D97706',
        muted: '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        lift: '0 4px 12px rgba(15,23,42,0.08)',
      },
    },
  },
  plugins: [],
};
