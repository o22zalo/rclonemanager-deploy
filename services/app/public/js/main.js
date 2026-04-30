(function () {
  const ROUTES = ['oauth', 'credentials', 'configs', 'manager', 'rclone', 'settings'];

  function $(id) {
    return document.getElementById(id);
  }

  function routeFromHash() {
    const raw = window.location.hash.replace('#', '');
    return ROUTES.includes(raw) ? raw : 'oauth';
  }

  function setActiveRoute(route) {
    ROUTES.forEach((name) => {
      $(`section-${name}`)?.classList.toggle('section--active', name === route);
    });

    document.querySelectorAll('[data-route]').forEach((link) => {
      const active = link.dataset.route === route;
      if (link.classList.contains('sidebar__link')) {
        link.classList.toggle('sidebar__link--active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      if (link.classList.contains('bottom-nav__item')) {
        link.classList.toggle('bottom-nav__item--active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    });

    window.App.Sidebar?.closeMobileSidebar();

    if (route === 'credentials') window.App.Credentials?.loadPresets();
    if (route === 'configs') window.App.Configs?.loadConfigs();
    if (route === 'manager') window.App.Manager?.refreshOptions();
    if (route === 'rclone') {
      window.App.RcloneCommands?.refreshOptions();
      window.App.RcloneCommands?.loadSavedCommands();
    }
  }

  function runnerText(backend) {
    const parts = [];
    if (backend.runnerCommitShortId) parts.push(`commit ${backend.runnerCommitShortId}`);
    if (backend.runnerCommitAt) parts.push(backend.runnerCommitAt);
    return parts.length ? ` · ${parts.join(' · ')}` : '';
  }

  function updateBackendStatusUi() {
    const backend = window.App.state.backend;
    const badge = $('backendStatusBadge');
    const footer = $('footerStatus');
    const settingsStatus = $('settingsBackendStatus');
    const settingsVersion = $('settingsVersion');
    const settingsRunnerCommit = $('settingsRunnerCommit');
    const settingsRunnerCommitAt = $('settingsRunnerCommitAt');
    const settingsUrl = $('settingsBackendUrl');

    if (badge) {
      badge.className = `badge ${backend.online ? 'badge--green' : 'badge--red'}`;
      badge.textContent = backend.online ? `Backend ok${runnerText(backend)} · Firebase ${backend.firebase}` : 'Backend offline';
    }
    if (footer) {
      footer.textContent = backend.online
        ? `Backend ${backend.version}${runnerText(backend)} · Firebase ${backend.firebase} (${backend.mode})`
        : 'Backend offline';
    }
    if (settingsStatus) settingsStatus.textContent = backend.online ? `ok · Firebase ${backend.firebase}` : 'offline';
    if (settingsVersion) settingsVersion.textContent = backend.version || '-';
    if (settingsRunnerCommit) settingsRunnerCommit.textContent = backend.runnerCommitShortId || '-';
    if (settingsRunnerCommitAt) settingsRunnerCommitAt.textContent = backend.runnerCommitAt || '-';
    if (settingsUrl) settingsUrl.textContent = window.App.api.baseUrl;
    window.App.OAuth?.setBackendBanner();
  }

  async function refreshBackendStatus() {
    await window.App.api.checkBackend();
    updateBackendStatusUi();
  }

  async function exportAllConfigs() {
    try {
      const data = await window.App.api.request('/api/configs?limit=10000&offset=0');
      window.App.utils.downloadText(
        'rclone-configs-backup.json',
        `${JSON.stringify(data.items || [], null, 2)}\n`,
        'application/json',
      );
    } catch (err) {
      window.App.utils.toast(`Không export được configs: ${err.message}`, true);
    }
  }

  function bindSettings() {
    $('testConnectionBtn')?.addEventListener('click', async () => {
      await refreshBackendStatus();
      window.App.utils.toast(window.App.state.backend.online ? 'Backend connected.' : 'Backend offline.', !window.App.state.backend.online);
    });
    $('clearCacheBtn')?.addEventListener('click', () => {
      window.App.Credentials?.clearCache();
      window.App.utils.toast('Đã clear presets cache.');
    });
    $('exportAllConfigsBtn')?.addEventListener('click', exportAllConfigs);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js?v=20260430-5').catch(() => {});
      });
    }
  }

  async function init() {
    window.App.Theme?.init();
    window.App.Sidebar?.init();
    window.App.OAuth?.init();
    window.App.Credentials?.init();
    window.App.Configs?.init();
    window.App.Manager?.init();
    window.App.RcloneCommands?.init();
    bindSettings();
    registerServiceWorker();

    await refreshBackendStatus();
    await window.App.Credentials?.loadPresets();
    await window.App.Configs?.loadConfigs();
    await window.App.Manager?.refreshOptions();
    await window.App.RcloneCommands?.refreshOptions();
    await window.App.RcloneCommands?.loadSavedCommands();
    setActiveRoute(routeFromHash());
  }

  window.addEventListener('hashchange', () => setActiveRoute(routeFromHash()));
  document.addEventListener('DOMContentLoaded', init);
})();
