/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        'custom-color-primary': '#E5DCB7',
        'custom-color-secondary': '#11948C',
        'custom-color-tertiary': '#10d9ef',
        'custom-btn-color': '#94B9AF',
        'custom-btn-bg': '#94B9AF',
        'custom-btn-hover-bg': '#efede1',
        'custom-btn-hover-text': '#94B9AF',
        'custom-btn-active-bg': '#5E8C75',
        'custom-btn-text': '#efede1',
      }
    },
  },
  plugins: [],
}
