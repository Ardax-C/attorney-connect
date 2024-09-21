module.exports = {
  content: [
    './src/**/*.{html,js,svelte,ts}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        'custom-color-primary': '#E5DCB7',
        'custom-color-secondary': '#11948C',
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