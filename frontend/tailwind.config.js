/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          900: '#0d1f17',
          800: '#091510',
          700: '#122218',
          600: '#1e3a2a',
          500: '#0f1c14',
        },
        grass: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        accent: {
          green:  '#22c55e',
          gold:   '#f59e0b',
          yellow: '#fbbf24',
          red:    '#ef4444',
          blue:   '#38bdf8',
          purple: '#c084fc',
          cyan:   '#22d3ee',
          orange: '#fb923c',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Oswald', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card':     '0 4px 24px rgba(0,0,0,0.5)',
        'card-glow':'0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.1)',
        'header':   '0 2px 20px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
