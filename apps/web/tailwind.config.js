/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#0B0D10',
          dark: '#070809',
          card: '#12161F',
          raised: '#1A202C',
          well: '#0E1217',
          border: '#232936',
        },
        cred: {
          mint: '#00F29D',
          'mint-dark': '#00C27E',
          gold: '#F6C876',
          crimson: '#FF4D4D',
          amber: '#FF9F0A',
          silver: '#A0AEC0',
        },
      },
      boxShadow: {
        'well-inset': 'inset 3px 3px 7px rgba(0, 0, 0, 0.85), inset -2px -2px 5px rgba(255, 255, 255, 0.04)',
        'pill-raised': '4px 6px 14px rgba(0, 0, 0, 0.6), -2px -2px 6px rgba(255, 255, 255, 0.05)',
        'neon-mint': '0 0 24px rgba(0, 242, 157, 0.45)',
        'neon-crimson': '0 0 24px rgba(255, 77, 77, 0.45)',
        'neon-gold': '0 0 24px rgba(246, 200, 118, 0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

