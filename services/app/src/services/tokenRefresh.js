const { buildRcloneConfig } = require('../utils/configBuilder');
const { decryptIfConfigured } = require('../utils/encryption');
const { assertOAuthClientSecret, sanitizeOAuthConfig } = require('../utils/oauthClients');

async function postForm(url, params) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const detail = data.error_description || data.error || response.statusText;
    throw new Error(`Token refresh failed: ${detail}`);
  }
  return data;
}

async function refreshAccessToken(record) {
  if (!record.refreshToken) {
    throw new Error('Config does not contain a refresh token.');
  }

  const cfg = sanitizeOAuthConfig({
    ...record,
    clientSecret: decryptIfConfigured(record.clientSecret || ''),
  });
  assertOAuthClientSecret(cfg);

  let token;
  if (record.provider === 'gd') {
    token = await postForm('https://oauth2.googleapis.com/token', {
      refresh_token: record.refreshToken,
      client_id: record.clientId,
      client_secret: cfg.clientSecret || '',
      grant_type: 'refresh_token',
    });
  } else {
    const params = {
      refresh_token: record.refreshToken,
      client_id: record.clientId,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Files.ReadWrite offline_access',
    };
    if (cfg.clientSecret) params.client_secret = cfg.clientSecret;
    token = await postForm('https://login.microsoftonline.com/common/oauth2/v2.0/token', params);
  }

  const built = buildRcloneConfig(cfg, token, record.refreshToken);
  return {
    accessToken: token.access_token,
    refreshToken: built.refreshToken,
    expiry: built.expiry,
    rcloneConfig: built.rcloneConfig,
    updatedAt: Date.now(),
    status: 'active',
  };
}

module.exports = {
  refreshAccessToken,
};
