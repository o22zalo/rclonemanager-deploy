const express = require('express');
const { parseStateParam } = require('../utils/stateParser');
const { exchangeOAuthCode } = require('../services/tokenExchange');
const { upsertByEmailOwner } = require('../services/configStore');
const { fetchOneDriveDrive } = require('../services/cloudApi');
const { injectOneDriveDriveId, normalizeConfigRecord } = require('../utils/configBuilder');
const { encryptIfConfigured } = require('../utils/encryption');
const { sanitizeOAuthConfig } = require('../utils/oauthClients');

const router = express.Router();

function requestBaseUrl(req) {
  const host = req.get('host');
  if (!host) return 'http://localhost:53682/';

  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  return `${protocol}://${host}/`;
}

function frontendRedirect(req, params) {
  const base = process.env.FRONTEND_URL || requestBaseUrl(req);
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function publicRecord(record) {
  if (!record) return null;
  const { clientSecret, ...safe } = record;
  safe.driveId = safe.driveId || safe.drive_id || '';
  if (safe.provider === 'od' && safe.driveId) {
    safe.rcloneConfig = injectOneDriveDriveId(safe.rcloneConfig, safe.driveId, safe.driveType);
  }
  return safe;
}

function normalizeRequestConfig(body) {
  const cfg = body.config || body.cfg || body;
  return sanitizeOAuthConfig({
    clientId: String(cfg.clientId || '').trim(),
    clientSecret: cfg.clientSecret ? String(cfg.clientSecret) : '',
    emailOwner: String(cfg.emailOwner || cfg.email_owner || '').trim(),
    provider: cfg.provider,
    remoteName: String(cfg.remoteName || 'myremote').trim(),
    scope: cfg.scope || 'drive',
    driveType: cfg.driveType || 'personal',
    redirectUri: String(cfg.redirectUri || '').trim(),
  });
}

function validateExchangeInput(code, cfg) {
  const missing = [];
  if (!code) missing.push('code');
  if (!cfg.clientId) missing.push('clientId');
  if (!cfg.emailOwner) missing.push('emailOwner');
  if (!cfg.provider) missing.push('provider');
  if (!cfg.remoteName) missing.push('remoteName');
  if (!cfg.redirectUri) missing.push('redirectUri');
  if (missing.length > 0) {
    const err = new Error(`Missing OAuth exchange fields: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (!['gd', 'od'].includes(cfg.provider)) {
    const err = new Error('Unsupported OAuth provider.');
    err.status = 400;
    throw err;
  }
  try {
    new URL(cfg.redirectUri);
  } catch (_err) {
    const err = new Error('redirectUri must be a valid URL.');
    err.status = 400;
    throw err;
  }
}

async function exchangeAndSave(code, cfg) {
  const token = await exchangeOAuthCode(cfg, code);
  if (cfg.provider === 'od' && token.access_token) {
    const drive = await fetchOneDriveDrive(token.access_token);
    cfg.driveId = drive.id || '';
  }

  const record = normalizeConfigRecord(cfg, token);
  record.clientSecret = encryptIfConfigured(record.clientSecret);
  return {
    cfg,
    token,
    saved: await upsertByEmailOwner(record),
  };
}

async function handleOAuthCallback(req, res) {
  if (req.query.error) {
    const detail = req.query.error_description || req.query.error;
    res.redirect(frontendRedirect(req, { error: detail }));
    return;
  }

  try {
    const cfg = parseStateParam(req.query.state);
    const { saved } = await exchangeAndSave(req.query.code, cfg);

    res.redirect(frontendRedirect(req, {
      saved: 'true',
      id: saved.record.id,
      remote: saved.record.remoteName,
      action: saved.action,
    }));
  } catch (err) {
    res.redirect(frontendRedirect(req, { error: err.message }));
  }
}

router.post('/exchange', async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim();
    const cfg = normalizeRequestConfig(req.body || {});
    validateExchangeInput(code, cfg);

    const { saved } = await exchangeAndSave(code, cfg);
    res.status(saved.action === 'created' ? 201 : 200).json({
      action: saved.action,
      record: publicRecord(saved.record),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = {
  handleOAuthCallback,
  router,
};
