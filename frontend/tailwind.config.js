/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          800: '#0f172a',
          900: '#0c1222',
          dark: '#111827',
        },
        grass: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        field: {
          light: '#1a2e1a',
          mid:   '#162714',
          dark:  '#0f1f0f',
        },
        card: {
          bg:     '#1e2d3d',
          border: '#2d4a63',
          hover:  '#253344',
          header: '#162536',
        },
        accent: {
          green:  '#4ade80',
          yellow: '#fbbf24',
          red:    '#f87171',
          blue:   '#60a5fa',
          purple: '#c084fc',
          cyan:   '#22d3ee',
          orange: '#fb923c',
          white:  '#f8fafc',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Oswald', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'pitch-gradient': 'linear-gradient(180deg, #0c1222 0%, #0f172a 100%)',
        'card-gradient':  'linear-gradient(135deg, #1e2d3d 0%, #162536 100%)',
        'green-glow':     'radial-gradient(ellipse at center, rgba(74,222,128,0.15) 0%, transparent 70%)',
        'hero-pattern':   "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322c55e' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'card':     '0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)',
        'card-glow': '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(74,222,128,0.15)',
        'header':   '0 2px 20px rgba(0,0,0,0.5)',
        'badge':    '0 2px 8px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
}
