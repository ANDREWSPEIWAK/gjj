/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        'warm-offwhite': '#F5F5DC',
        'agate-grey': '#8B8C7A',
        'red-accent': '#D32F2F',
        'indigo-accent': '#3F51B5',
      },
    },
  },
  plugins: [],
}
