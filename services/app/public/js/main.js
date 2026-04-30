(function () {
  const ROUTES = ['oauth-gd', 'oauth-od', 'credentials', 'configs', 'manager', 'rclone', 'settings'];

  function $(id) {
    return document.getElementById(id);
  }

  function routeFromHash() {
    const raw = window.location.hash.replace('#', '');
    return ROUTES.includes(raw) ? raw : 'oauth-gd';
  }

  function setActiveRoute(route) {
    ROUTES.forEach((name) => {
      const section = name.startsWith('oauth-') ? 'oauth' : name;
      $(`section-${section}`)?.classList.toggle('section--active', section === (route.startsWith('oauth-') ? 'oauth' : route));
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

    if (route === 'oauth-gd') window.App.OAuth?.setProviderFromRoute?.('gd');
    if (route === 'oauth-od') window.App.OAuth?.setProviderFromRoute?.('od');
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
    $('saveApiKeyBtn')?.addEventListener('click', () => { localStorage.setItem('backend-api-key', $('settingsApiKey').value.trim()); window.App.utils.toast('Đã lưu API key local.'); window.location.reload(); });
  }

  function bindGlobalDialogs() {
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      document.querySelectorAll(".modal.modal--open").forEach((m)=>m.classList.remove("modal--open"));
    });
  }


  async function initGoogleLogin() {
    const panel = $('googleLoginPanel');
    const btnWrap = $('googleLoginButton');
    const status = $('googleLoginStatus');
    if (!panel || !btnWrap || !window.google?.accounts?.id) return;
    try {
      const cfg = await window.App.api.request('/api/auth/config');
      if (!cfg.googleClientId) return;
      panel.classList.remove('hidden');
      const currentEmail = localStorage.getItem('google-login-email') || '';
      if (currentEmail) status.textContent = `Đã đăng nhập: ${currentEmail}`;
      google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: async (resp) => {
          try {
            const result = await window.App.api.request('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken: resp.credential }) });
            localStorage.setItem('google-login-email', result.email || '');
            status.textContent = `Đăng nhập thành công: ${result.email}`;
          } catch (err) { status.textContent = `Đăng nhập lỗi: ${err.message}`; }
        },
      });
      google.accounts.id.renderButton(btnWrap, { theme: 'outline', size: 'large', width: 300 });
    } catch (_err) {}
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
    bindGlobalDialogs();
    registerServiceWorker();
    await initGoogleLogin();

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
