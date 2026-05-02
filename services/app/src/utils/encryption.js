const crypto = require('crypto');

const PREFIX = 'enc:v1:';

function getKey() {
  const raw = process.env.RCLONE_MANAGER_ENCRYPTION_KEY;
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptIfConfigured(value) {
  const key = getKey();
  if (!key || !value) return value || '';

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX.slice(0, -1),
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

function decryptIfConfigured(value) {
  const key = getKey();
  if (!value || !String(value).startsWith(PREFIX)) return value || '';
  if (!key) return value;

  const [, version, ivText, tagText, encryptedText] = String(value).split(':');
  if (version !== 'v1') return value;

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  encryptIfConfigured,
  decryptIfConfigured,
};
