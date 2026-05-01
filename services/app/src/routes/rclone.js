const express = require('express');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const firebase = require('../services/firebase');
const { COLLECTION } = require('../services/configStore');
const { fetchOneDriveDrive } = require('../services/cloudApi');
const { runRclone } = require('../services/rcloneRunner');
const { refreshAccessToken } = require('../services/tokenRefresh');
const { injectOneDriveDriveId } = require('../utils/configBuilder');

const router = express.Router();
const COMMANDS_COLLECTION = 'rclone_commands';
const FULL_TEST_FOLDER = 'rclone-kiem-thu';

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

function pad2(value) {
  return String(value).padStart(2, '0');
}

function timestampForFilename(date = new Date()) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
    '-',
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds()),
  ].join('');
}

function formatLocalDateTime(date = new Date()) {
  return [
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
  ].join(' ');
}

async function getReadyRecord(id) {
  const record = await firebase.get(`${COLLECTION}/${id}`);
  if (!record) {
    const err = new Error(`Config not found: ${id}`);
    err.status = 404;
    throw err;
  }
  return ensureOneDriveDriveId(id, record);
}

function configTextForRecord(record) {
  const driveId = record.driveId || record.drive_id || '';
  if (record.provider === 'od' && driveId) {
    return injectOneDriveDriveId(record.rcloneConfig || '', driveId, record.driveType);
  }
  return record.rcloneConfig || '';
}

function remotePath(record, subPath = '') {
  const clean = String(subPath || '').replace(/^\/+/, '');
  return `${record.remoteName}:${clean}`;
}

function commandText(command) {
  const args = Array.isArray(command) ? command : [command];
  return `rclone ${args.map((arg) => {
    const text = String(arg || '');
    return /[\s"']/.test(text) ? `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"` : text;
  }).join(' ')}`;
}

async function runFullTestStep({ key, label, command, configText, outputMode, timeoutMs }) {
  const startedAt = Date.now();
  try {
    const result = await runRclone({
      command,
      configText,
      outputMode: outputMode || 'raw',
      timeoutMs,
    });
    const ok = result.exitCode === 0 && !result.timedOut && !result.jsonParseError;
    return {
      key,
      label,
      status: ok ? 'ok' : 'error',
      elapsedMs: Date.now() - startedAt,
      ...result,
    };
  } catch (err) {
    return {
      key,
      label,
      command: commandText(command),
      args: Array.isArray(command) ? command.map((item) => String(item)) : [],
      status: 'error',
      elapsedMs: Date.now() - startedAt,
      exitCode: null,
      timedOut: false,
      stdout: '',
      stderr: err.message,
      error: err.message,
    };
  }
}

async function writeFullTestLocalFile(content) {
  const filePath = path.join(
    os.tmpdir(),
    `rclone-kiem-thu-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
  );
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

async function runFullFlowTest({ configId, timeoutMs }) {
  const record = await getReadyRecord(configId);
  const configText = configTextForRecord(record);
  const now = new Date();
  const fileName = `${timestampForFilename(now)}.txt`;
  const remoteFolder = remotePath(record, FULL_TEST_FOLDER);
  const remoteFile = remotePath(record, `${FULL_TEST_FOLDER}/${fileName}`);
  const content = [
    'rclone kiem thu full flow',
    `remote=${record.remoteName}`,
    `time_local=${formatLocalDateTime(now)}`,
    `time_iso=${now.toISOString()}`,
    '',
  ].join('\n');
  const localFile = await writeFullTestLocalFile(content);

  const steps = [
    {
      key: 'mkdir',
      label: 'Tạo folder rclone-kiem-thu',
      command: ['mkdir', remoteFolder],
    },
    {
      key: 'upload',
      label: `Tạo file ${fileName}`,
      command: ['copyto', localFile, remoteFile],
    },
    {
      key: 'ls',
      label: 'Ls file vừa tạo',
      command: ['lsjson', remoteFile, '--stat'],
      outputMode: 'json',
    },
    {
      key: 'size',
      label: 'Xem dung lượng file',
      command: ['size', remoteFile, '--json'],
      outputMode: 'json',
    },
    {
      key: 'delete-file',
      label: 'Xóa file vừa tạo',
      command: ['deletefile', remoteFile],
    },
    {
      key: 'delete-folder',
      label: 'Xóa folder rclone-kiem-thu',
      command: ['rmdir', remoteFolder],
    },
  ];

  try {
    const results = [];
    for (const step of steps) {
      results.push(await runFullTestStep({
        ...step,
        configText,
        timeoutMs,
      }));
    }
    return {
      ok: results.every((step) => step.status === 'ok'),
      remoteName: record.remoteName,
      folder: FULL_TEST_FOLDER,
      fileName,
      remoteFile,
      content,
      steps: results,
    };
  } finally {
    await fs.unlink(localFile).catch(() => {});
  }
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

router.post('/full-test', async (req, res, next) => {
  try {
    const ids = normalizeIdList(req.body?.configIds || (req.body?.configId ? [req.body.configId] : []));
    if (ids.length === 0) {
      res.status(400).json({ error: 'configId is required.' });
      return;
    }

    const result = await runFullFlowTest({
      configId: ids[0],
      timeoutMs: req.body?.timeoutMs,
    });
    res.status(result.ok ? 200 : 422).json(result);
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
