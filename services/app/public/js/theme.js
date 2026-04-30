(function () {
  const THEME_KEY = 'app-theme';

  function getTheme() {
    return localStorage.getItem(THEME_KEY)
      || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.content = theme === 'dark' ? '#0f172a' : '#2563eb';
  }

  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function init() {
    applyTheme(getTheme());
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  }

  window.App = window.App || {};
  window.App.Theme = { init, applyTheme, getTheme, toggleTheme };
})();
