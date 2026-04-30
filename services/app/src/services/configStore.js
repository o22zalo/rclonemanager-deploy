const firebase = require('./firebase');

const COLLECTION = 'rclone_configs';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function findByEmailOwner(emailOwner) {
  const normalized = normalizeEmail(emailOwner);
  if (!normalized) return null;

  const items = await firebase.list(COLLECTION);
  return items
    .filter((item) => normalizeEmail(item.emailOwner || item.email_owner) === normalized)
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))[0] || null;
}

async function upsertByEmailOwner(record) {
  const existing = await findByEmailOwner(record.emailOwner);
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
  findByEmailOwner,
  upsertByEmailOwner,
};
