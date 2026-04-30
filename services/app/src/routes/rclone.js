const express = require('express');
const firebase = require('../services/firebase');
const { COLLECTION } = require('../services/configStore');
const { fetchOneDriveDrive } = require('../services/cloudApi');
const { runRclone } = require('../services/rcloneRunner');
const { refreshAccessToken } = require('../services/tokenRefresh');
const { injectOneDriveDriveId } = require('../utils/configBuilder');

const router = express.Router();
const COMMANDS_COLLECTION = 'rclone_commands';

function normalizeIdList(value) {
  const list = Array.isArray(value) ? value : [];
  return Array.from(new Set(list.map((item) => String(item || '').trim()).filter(Boolean)));
}

function publicCommand(record) {
  if (!record) return null;
  return {
    id: record.id,
    name: record.name || '',
    command: record.command || '',
    outputMode: record.outputMode || 'raw',
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  };
}

function extractDriveId(rcloneConfig) {
  const match = String(rcloneConfig || '').match(/^\s*drive_id\s*=\s*(.+?)\s*$/mi);
  return match ? match[1].trim() : '';
}

async function refreshThenFetchOneDrive(record, path) {
  const refreshed = await refreshAccessToken(record);
  const nextRecord = { ...record, ...refreshed };
  await firebase.update(path, refreshed);
  return {
    record: nextRecord,
    drive: await fetchOneDriveDrive(nextRecord),
  };
}

async function ensureOneDriveDriveId(id, record) {
  if (record.provider !== 'od') return record;

  let driveId = record.driveId || record.drive_id || extractDriveId(record.rcloneConfig);
  if (driveId) {
    const rcloneConfig = injectOneDriveDriveId(record.rcloneConfig || '', driveId, record.driveType);
    if (!record.driveId || rcloneConfig !== record.rcloneConfig) {
      await firebase.update(`${COLLECTION}/${id}`, {
        driveId,
        rcloneConfig,
        updatedAt: Date.now(),
      });
    }
    return { ...record, driveId, rcloneConfig };
  }

  const path = `${COLLECTION}/${id}`;
  let current = record;
  let drive;
  try {
    drive = await fetchOneDriveDrive(current);
  } catch (err) {
    if (err.status !== 'expired') throw err;
    const refreshed = await refreshThenFetchOneDrive(current, path);
    current = refreshed.record;
    drive = refreshed.drive;
  }

  driveId = drive.id || '';
  if (!driveId) {
    throw new Error(`Unable to resolve OneDrive drive_id for ${record.remoteName || id}. Re-auth this config.`);
  }

  const rcloneConfig = injectOneDriveDriveId(current.rcloneConfig || '', driveId, current.driveType);
  await firebase.update(path, {
    driveId,
    rcloneConfig,
    updatedAt: Date.now(),
    status: 'active',
  });
  return { ...current, driveId, rcloneConfig, status: 'active' };
}

async function buildConfigText(configIds) {
  const ids = normalizeIdList(configIds);
  if (ids.length === 0) return '';

  const records = await Promise.all(ids.map(async (id) => ({
    id,
    record: await firebase.get(`${COLLECTION}/${id}`),
  })));

  const missing = records.filter((item) => !item.record).map((item) => item.id);
  if (missing.length > 0) {
    const err = new Error(`Config not found: ${missing.join(', ')}`);
    err.status = 404;
    throw err;
  }

  const readyRecords = await Promise.all(records.map(async (item) => ({
    ...item,
    record: await ensureOneDriveDriveId(item.id, item.record),
  })));

  return readyRecords.map((item) => {
    const record = item.record;
    const driveId = record.driveId || record.drive_id || '';
    if (record.provider === 'od' && driveId) {
      return injectOneDriveDriveId(record.rcloneConfig || '', driveId, record.driveType);
    }
    return record.rcloneConfig || '';
  }).filter(Boolean).join('\n\n');
}

function normalizeSavedCommand(body, existing = {}) {
  const now = Date.now();
  return {
    id: existing.id,
    name: String(body.name || existing.name || '').trim(),
    command: String(body.command || existing.command || '').trim(),
    outputMode: body.outputMode === 'json' ? 'json' : 'raw',
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
}

async function findSavedCommandByName(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) return null;
  const items = await firebase.list(COMMANDS_COLLECTION);
  return items.find((item) => String(item.name || '').trim().toLowerCase() === normalized) || null;
}

router.post('/run', async (req, res, next) => {
  try {
    const configText = await buildConfigText(req.body?.configIds);
    const result = await runRclone({
      command: req.body?.command,
      configText,
      outputMode: req.body?.outputMode === 'json' ? 'json' : 'raw',
      timeoutMs: req.body?.timeoutMs,
    });
    res.status(result.exitCode === 0 && !result.timedOut ? 200 : 422).json(result);
  } catch (err) {
    if (err.code === 'ENOENT') {
      err.message = 'rclone executable was not found in PATH.';
      err.status = 500;
    }
    next(err);
  }
});

router.get('/saved-commands', async (_req, res, next) => {
  try {
    const items = (await firebase.list(COMMANDS_COLLECTION))
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
      .map(publicCommand);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post('/saved-commands', async (req, res, next) => {
  try {
    const body = req.body || {};
    const existing = body.id
      ? await firebase.get(`${COMMANDS_COLLECTION}/${body.id}`)
      : await findSavedCommandByName(body.name);
    const record = normalizeSavedCommand(body, existing || {});
    if (!record.name || !record.command) {
      res.status(400).json({ error: 'name and command are required.' });
      return;
    }

    if (existing?.id || body.id) {
      const id = existing?.id || body.id;
      const saved = await firebase.set(`${COMMANDS_COLLECTION}/${id}`, { ...record, id });
      res.json(publicCommand(saved));
      return;
    }

    const saved = await firebase.push(COMMANDS_COLLECTION, record);
    res.status(201).json(publicCommand(saved));
  } catch (err) {
    next(err);
  }
});

router.delete('/saved-commands/:id', async (req, res, next) => {
  try {
    await firebase.remove(`${COMMANDS_COLLECTION}/${req.params.id}`);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
