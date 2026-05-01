#!/usr/bin/env node
// ================================================================
//  docker-compose/scripts/validate-compose.js
//  Runs `docker compose config` across all 4 compose files to
//  validate the merged YAML resolves without errors.
// ================================================================
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FILES = [
  'docker-compose/compose.core.yml',
  'docker-compose/compose.ops.yml',
  'docker-compose/compose.access.yml',
  'compose.apps.yml',
];

console.log('\n🐳  Compose Config Validation\n');

// Check all files exist
let abort = false;
for (const f of FILES) {
  if (!fs.existsSync(f)) {
    console.error(`❌  ${f} not found`);
    abort = true;
  } else {
    console.log(`    ✅  ${f}`);
  }
}
if (abort) process.exit(1);

const fileArgs = FILES.map(f => `-f ${f}`).join(' ');
const args = [
  'compose',
  ...FILES.flatMap((f) => ['-f', f]),
  '--project-directory',
  process.cwd(),
  'config',
  '--quiet',
];

console.log(`\n    Running: docker compose ${fileArgs} config ...\n`);

try {
  execFileSync('docker', args, { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') });
  console.log('\n✅  Compose configuration is valid!\n');
} catch {
  console.log('\n❌  Compose validation failed — fix YAML errors above.\n');
  process.exit(1);
}
