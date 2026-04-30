const express = require('express');
const firebase = require('../services/firebase');
const { encryptIfConfigured, decryptIfConfigured } = require('../utils/encryption');
const { assertOAuthClientSecret, sanitizeOAuthConfig } = require('../utils/oauthClients');

const router = express.Router();
const COLLECTION = 'credentials_presets';

function publicPreset(record) {
  if (!record) return null;
  return {
    ...record,
    clientSecret: decryptIfConfigured(record.clientSecret || ''),
  };
}

function normalizePreset(body, existing = {}) {
  const now = Date.now();
  const preset = sanitizeOAuthConfig({
    label: body.label || existing.label || '',
    provider: body.provider || existing.provider || 'gd',
    clientId: body.clientId || existing.clientId || '',
    clientSecret: body.clientSecret !== undefined ? body.clientSecret : decryptIfConfigured(existing.clientSecret || ''),
    redirectUri: body.redirectUri || existing.redirectUri || 'http://localhost:53682/',
    createdAt: existing.createdAt || now,
    updatedAt: now,
  });
  assertOAuthClientSecret(preset);
  return {
    ...preset,
    clientSecret: encryptIfConfigured(preset.clientSecret),
  };
}

router.get('/', async (_req, res, next) => {
  try {
    const items = (await firebase.list(COLLECTION))
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .map(publicPreset);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const preset = normalizePreset(req.body || {});
    if (!preset.label || !preset.clientId || !['gd', 'od'].includes(preset.provider)) {
      res.status(400).json({ error: 'label, provider and clientId are required.' });
      return;
    }
    const saved = await firebase.push(COLLECTION, preset);
    res.status(201).json(publicPreset(saved));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const path = `${COLLECTION}/${req.params.id}`;
    const existing = await firebase.get(path);
    if (!existing) {
      res.status(404).json({ error: 'Preset not found.' });
      return;
    }
    const updated = await firebase.set(path, {
      ...normalizePreset(req.body || {}, existing),
      id: req.params.id,
    });
    res.json(publicPreset(updated));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await firebase.remove(`${COLLECTION}/${req.params.id}`);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
