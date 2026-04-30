const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 120000;
const MAX_TIMEOUT_MS = 15 * 60 * 1000;

function parseCommandLine(input) {
  const text = String(input || '').trim();
  if (!text) return [];

  const tokens = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (quote === '"' && char === '\\' && i + 1 < text.length) {
        i += 1;
        current += text[i];
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (quote) {
    throw new Error('Command contains an unclosed quote.');
  }
  if (current) tokens.push(current);
  return tokens;
}

function normalizeArgs(command) {
  const args = Array.isArray(command)
    ? command.map((item) => String(item))
    : parseCommandLine(command);

  if (args.length === 0) {
    throw new Error('Rclone command is required.');
  }

  if (/^rclone(\.exe)?$/i.test(path.basename(args[0]))) {
    args.shift();
  }

  if (args.length === 0) {
    throw new Error('Rclone subcommand is required.');
  }

  if (args.some((arg) => arg === '--config' || arg.startsWith('--config='))) {
    throw new Error('Do not pass --config manually. The selected configs are injected automatically.');
  }

  return args;
}

function appendBounded(target, chunk, state) {
  if (state.bytes >= MAX_OUTPUT_BYTES) {
    state.truncated = true;
    return target;
  }

  const text = chunk.toString('utf8');
  const remaining = MAX_OUTPUT_BYTES - state.bytes;
  const next = Buffer.byteLength(text, 'utf8') > remaining
    ? text.slice(0, remaining)
    : text;
  state.bytes += Buffer.byteLength(next, 'utf8');
  if (next.length < text.length) state.truncated = true;
  return target + next;
}

async function writeTempConfig(configText) {
  const filename = `rclone-manager-${Date.now()}-${Math.random().toString(36).slice(2)}.conf`;
  const filePath = path.join(os.tmpdir(), filename);
  await fs.writeFile(filePath, `${String(configText || '').trim()}\n`, 'utf8');
  return filePath;
}

async function runRclone({ command, configText, outputMode = 'raw', timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const args = normalizeArgs(command);
  const configPath = await writeTempConfig(configText);
  const timeout = Math.min(Math.max(Number(timeoutMs || DEFAULT_TIMEOUT_MS), 1000), MAX_TIMEOUT_MS);

  try {
    return await new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const stdoutState = { bytes: 0, truncated: false };
      const stderrState = { bytes: 0, truncated: false };
      let timedOut = false;
      let settled = false;

      const child = spawn('rclone', args, {
        env: {
          ...process.env,
          RCLONE_CONFIG: configPath,
        },
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000).unref();
      }, timeout);

      child.stdout.on('data', (chunk) => {
        stdout = appendBounded(stdout, chunk, stdoutState);
      });

      child.stderr.on('data', (chunk) => {
        stderr = appendBounded(stderr, chunk, stderrState);
      });

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });

      child.on('close', (exitCode, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        const result = {
          command: `rclone ${args.join(' ')}`,
          args,
          exitCode,
          signal,
          timedOut,
          stdout,
          stderr,
          truncated: stdoutState.truncated || stderrState.truncated,
          outputMode,
        };

        if (outputMode === 'json' && stdout.trim()) {
          try {
            result.json = JSON.parse(stdout);
          } catch (err) {
            result.jsonParseError = err.message;
          }
        }

        resolve(result);
      });
    });
  } finally {
    await fs.unlink(configPath).catch(() => {});
  }
}

module.exports = {
  parseCommandLine,
  runRclone,
};
