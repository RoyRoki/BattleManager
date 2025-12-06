/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFBA00',
        accent: '#FFD700',
        bg: '#0A0A0A',
        'bg-secondary': '#1A1A1A',
        'bg-tertiary': '#2A2A2A',
      },
      fontFamily: {
        heading: ['Orbitron', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #FFBA00, 0 0 10px #FFBA00' },
          '100%': { boxShadow: '0 0 10px #FFBA00, 0 0 20px #FFBA00, 0 0 30px #FFBA00' },
        },
      },
    },
  },
  plugins: [],
}


