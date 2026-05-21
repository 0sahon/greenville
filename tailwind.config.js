/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#F4F8F0',  // Sage cream
          100: '#E9F1DF', // Light sage
          200: '#D2E3BE', // Pale lime/green
          300: '#AECF8E', // Soft apple green
          400: '#85B65A', // Bright green
          500: '#95C11E', // Official Lime Green logo color!
          600: '#064035', // Official Forest Green (Primary brand)
          700: '#053A30', // Deep Forest Green
          800: '#032620', // Deeper green
          900: '#021A16', // Darkest green
          950: '#01110E',
        },
        brand: {
          green: '#95C11E',
          dark: '#053A30',
          gold: '#CF9E42',
        }
      }
    },
  },
  plugins: [],
};
