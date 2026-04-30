const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const { handleOAuthCallback, router: oauthRouter } = require('./routes/oauth');
const configsRouter = require('./routes/configs');
const presetsRouter = require('./routes/presets');
const rcloneRouter = require('./routes/rclone');
const firebase = require('./services/firebase');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 53682);
const publicDir = path.join(__dirname, '..', 'public');

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
