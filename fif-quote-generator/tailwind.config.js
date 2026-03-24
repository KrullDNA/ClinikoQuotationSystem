/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{html,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5fd',
          100: '#d4e4f7',
          200: '#a9c9ef',
          300: '#7eaee7',
          400: '#4a8fd9',
          500: '#2980B9',
          600: '#236fa3',
          700: '#2C3E50',
          800: '#243342',
          900: '#1a2530'
        }
      }
    }
  },
  plugins: []
};
