const firebase = require('./firebase');

const COLLECTION = 'rclone_configs';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeProvider(value) {
  return String(value || '').trim().toLowerCase();
}

async function findByEmailOwnerAndProvider(emailOwner, provider) {
  const normalized = normalizeEmail(emailOwner);
  const normalizedProvider = normalizeProvider(provider);
  if (!normalized || !normalizedProvider) return null;

  const items = await firebase.list(COLLECTION);
  return items
    .filter((item) =>
      normalizeEmail(item.emailOwner || item.email_owner) === normalized
      && normalizeProvider(item.provider) === normalizedProvider)
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0] || null;
}

async function upsertByEmailOwnerAndProvider(record) {
  const existing = await findByEmailOwnerAndProvider(record.emailOwner, record.provider);
  if (!existing) {
    return {
      action: 'created',
      record: await firebase.push(COLLECTION, record),
    };
  }

  const now = Date.now();
  const saved = await firebase.update(`${COLLECTION}/${existing.id}`, {
    ...record,
    id: existing.id,
    createdAt: existing.createdAt || record.createdAt || now,
    updatedAt: now,
  });

  return {
    action: 'updated',
    record: saved,
  };
}

module.exports = {
  COLLECTION,
  findByEmailOwner: findByEmailOwnerAndProvider,
  findByEmailOwnerAndProvider,
  upsertByEmailOwner: upsertByEmailOwnerAndProvider,
  upsertByEmailOwnerAndProvider,
};
