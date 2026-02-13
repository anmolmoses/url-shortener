/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        secondary: '#0EA5E9',
        background: '#0F172A',
        surface: '#1E293B',
        'text-primary': '#F1F5F9',
        'text-muted': '#94A3B8',
        accent: '#22D3EE',
        success: '#10B981',
        error: '#EF4444',
        'border-color': '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        h1: '30px',
        h2: '24px',
        h3: '18px',
        body: '14px',
        small: '12px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};