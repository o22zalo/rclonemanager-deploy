(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function optionLabel(config) {
    const provider = config.provider === 'gd' ? 'GD' : 'OD';
    return `${config.remoteName} (${provider}) - ${config.emailOwner || 'no email'}`;
  }

  async function fetchAllConfigsForSelect() {
    if ((window.App.state.configs || []).length > 0) return window.App.state.configs;
    const data = await window.App.api.request('/api/configs?limit=500&offset=0');
    return data.items || [];
  }

  async function refreshOptions() {
    const select = $('managerConfigSelect');
    if (!select) return;
    const current = select.value;
    let configs = [];
    try {
      configs = await fetchAllConfigsForSelect();
    } catch (_err) {
      configs = window.App.state.configs || [];
    }
    select.innerHTML = '';
    configs.forEach((config) => {
      const option = document.createElement('option');
      option.value = config.id;
      option.textContent = optionLabel(config);
      select.appendChild(option);
    });
    if (current && Array.from(select.options).some((option) => option.value === current)) {
      select.value = current;
    }
    renderSelectedSummary();
  }

  async function selectedConfig() {
    const id = $('managerConfigSelect')?.value;
    if (!id) return null;
    return window.App.Configs.getConfigById(id);
  }

  async function renderSelectedSummary() {
    const config = await selectedConfig().catch(() => null);
    if (!config) {
      $('managerStatus').textContent = '-';
      $('managerUsed').textContent = '-';
      $('managerTotal').textContent = '-';
      $('managerPercent').textContent = '0%';
      $('managerProgress').style.width = '0%';
      $('managerFilesBody').innerHTML = '<tr><td colspan="4" class="text-tertiary">Chọn config để xem files.</td></tr>';
      return;
    }
    updateQuotaView({
      storageUsed: config.storageUsed,
      storageTotal: config.storageTotal,
    }, config.status || 'active');
  }

  function updateQuotaView(quota, status) {
    const used = Number(quota.storageUsed || 0);
    const total = quota.storageTotal ? Number(quota.storageTotal) : 0;
    const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    $('managerStatus').innerHTML = `<span class="${window.App.utils.statusBadgeClass(status)}">${status || 'unknown'}</span>`;
    $('managerUsed').textContent = window.App.utils.formatBytes(used);
    $('managerTotal').textContent = total > 0 ? window.App.utils.formatBytes(total) : '-';
    $('managerPercent').textContent = `${percent.toFixed(1)}%`;
    $('managerProgress').style.width = `${percent}%`;
  }

  function renderFiles(files) {
    const tbody = $('managerFilesBody');
    if (!files || files.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-tertiary">Không có file để hiển thị.</td></tr>';
      return;
    }
    tbody.innerHTML = files.map((file) => `
      <tr>
        <td>${escapeHtml(file.name)}</td>
        <td>${window.App.utils.formatBytes(file.size)}</td>
        <td>${escapeHtml(file.type || '-')}</td>
        <td>${escapeHtml(file.modified ? window.App.utils.formatDate(file.modified) : '-')}</td>
      </tr>
    `).join('');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function reloadManagerData() {
    const id = $('managerConfigSelect')?.value;
    if (!id) {
      window.App.utils.toast('Chọn config trước.', true);
      return;
    }
    try {
      const quota = await window.App.api.request(`/api/configs/${id}/quota`);
      updateQuotaView(quota, 'active');
      const files = await window.App.api.request(`/api/configs/${id}/files`);
      renderFiles(files.files || []);
      if (window.App.Configs) await window.App.Configs.loadConfigs();
    } catch (err) {
      window.App.utils.toast(`Không reload được manager: ${err.message}`, true);
      updateQuotaView({ storageUsed: 0, storageTotal: 0 }, 'error');
    }
  }

  async function refreshToken() {
    const id = $('managerConfigSelect')?.value;
    if (!id) {
      window.App.utils.toast('Chọn config trước.', true);
      return;
    }
    try {
      await window.App.api.request(`/api/configs/${id}/refresh`, { method: 'POST' });
      window.App.utils.toast('Đã refresh token.');
      await reloadManagerData();
    } catch (err) {
      window.App.utils.toast(`Refresh token thất bại: ${err.message}`, true);
    }
  }

  function bindEvents() {
    $('managerConfigSelect')?.addEventListener('change', renderSelectedSummary);
    $('managerReloadBtn')?.addEventListener('click', reloadManagerData);
    $('managerRefreshTokenBtn')?.addEventListener('click', refreshToken);
  }

  function init() {
    bindEvents();
  }

  window.App = window.App || {};
  window.App.Manager = {
    init,
    refreshOptions,
    reloadManagerData,
  };
})();
