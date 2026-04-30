const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');

const { handleOAuthCallback, router: oauthRouter } = require('./routes/oauth');
const configsRouter = require('./routes/configs');
const presetsRouter = require('./routes/presets');
const rcloneRouter = require('./routes/rclone');
const firebase = require('./services/firebase');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 53682);
const publicDir = path.join(__dirname, '..', 'public');



function signSession(email) {
  const exp = Date.now() + (Number(process.env.AUTH_SESSION_TTL_MS || 86400000));
  const payload = `${email}|${exp}`;
  const sig = crypto.createHmac('sha256', process.env.AUTH_SESSION_SECRET || 'change-me').update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function verifySession(token) {
  try {
    const decoded = Buffer.from(String(token || ''), 'base64url').toString('utf8');
    const [email, expRaw, sig] = decoded.split('|');
    const exp = Number(expRaw || 0);
    if (!email || !exp || Date.now() > exp) return null;
    const payload = `${email}|${exp}`;
    const expected = crypto.createHmac('sha256', process.env.AUTH_SESSION_SECRET || 'change-me').update(payload).digest('hex');
    if (expected !== sig) return null;
    return { email, exp };
  } catch (_err) { return null; }
}

function requireGoogleAuth(req, res, next) {
  const required = String(process.env.REQUIRE_GOOGLE_AUTH || 'true') === 'true';
  if (!required) return next();
  const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const session = verifySession(bearer);
  if (!session) return res.status(401).json({ error: 'Google auth required.' });
  req.user = session;
  return next();
}

function parseAllowlist() {
  return (process.env.ALLOWED_GMAILS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
}

function apiKeyAuth(req, res, next) {
  const key = process.env.BACKEND_API_KEY || '';
  if (!key) return next();
  const incoming = req.get('x-api-key') || req.query.apiKey || '';
  if (incoming === key) return next();
  res.status(401).json({ error: 'Invalid API key.' });
}

async function googleLogin(req, res) {
  const idToken = String(req.body?.idToken || '');
  if (!idToken) return res.status(400).json({ error: 'Missing idToken.' });
  const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const resp = await fetch(tokenInfoUrl);
  const info = await resp.json();
  if (!resp.ok) return res.status(401).json({ error: info.error_description || 'Invalid Google token.' });
  const email = String(info.email || '').toLowerCase();
  const allowed = parseAllowlist();
  if (allowed.length && !allowed.includes(email)) return res.status(403).json({ error: 'Email not allowed.' });
  const sessionToken = signSession(email);
  res.json({ ok: true, email, name: info.name || '', picture: info.picture || '', sessionToken });
}


app.set('trust proxy', true);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.post('/api/auth/google', googleLogin);
app.get('/api/auth/config', (_req, res) => {
  res.json({
    firebaseApiKey: process.env.GOOGLE_AUTH_FIREBASE_API_KEY || '',
    firebaseAuthDomain: process.env.GOOGLE_AUTH_FIREBASE_AUTH_DOMAIN || '',
    firebaseProjectId: process.env.GOOGLE_AUTH_FIREBASE_PROJECT_ID || '',
    googleClientId: process.env.GOOGLE_AUTH_CLIENT_ID || '',
    allowedGmails: parseAllowlist(),
  });
});

app.use('/api', apiKeyAuth);
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path === '/auth/config' || req.path.startsWith('/oauth')) return next();
  return requireGoogleAuth(req, res, next);
});

app.get('/health', async (_req, res) => {
  const status = await firebase.getStatus();
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    firebase: status.connected ? 'connected' : 'error',
    firebaseMode: status.mode,
    message: status.message,
    runnerCommitShortId: process.env._DOTENVRTDB_RUNNER_COMMIT_SHORT_ID || '',
    runnerCommitAt: process.env._DOTENVRTDB_RUNNER_COMMIT_AT || '',
  });
});

app.use('/api/configs', configsRouter);
app.use('/api/presets', presetsRouter);
app.use('/api/rclone', rcloneRouter);
app.use('/api/oauth', oauthRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.get('/', async (req, res, next) => {
  if (req.query.code || (req.query.error && req.query.state)) {
    await handleOAuthCallback(req, res, next);
    return;
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(express.static(publicDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

firebase.initialize()
  .catch((err) => {
    console.warn(`Firebase initialization warning: ${err.message}`);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`rclone OAuth Manager listening on http://localhost:${port}/`);
    });
  });
