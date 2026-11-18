/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#107B6C',
          'primary-hover': '#0d6558',
          'primary-light': '#159684',
          secondary: '#8AC5AB',
          accent: '#D6F3EE',
          dark: '#0F5F54',
          bg: '#F8F7F2',
          surface: '#FFFFFF',
          muted: '#6B7280',
          border: '#E5E7EB',
        },
      },
    },
  },
  plugins: [],
};
