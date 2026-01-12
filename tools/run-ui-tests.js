#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const node = process.execPath;
const scripts = [
  path.resolve(__dirname, 'check-local-ui.js'),
  path.resolve(__dirname, '../tests/e2e/toggle-logic.test.js'),
  path.resolve(__dirname, '../tests/e2e/live-toggle.test.js'),
];

function run(script) {
  console.log('\n===== RUNNING:', script, '=====\n');
  const res = spawnSync(node, [script], { stdio: 'inherit' });
  if (res.error) {
    console.error('ERROR running', script, res.error);
    return res.error.code || 1;
  }
  if (res.status !== 0) {
    console.error('\nFAIL:', script, 'exited with code', res.status);
    return res.status;
  }
  console.log('\nPASS:', script);
  return 0;
}

let code = 0;
for (const s of scripts) {
  code = run(s);
  if (code !== 0) break;
}

if (code !== 0) {
  console.error('\nOne or more UI tests failed. See output above.');
  process.exit(code);
}

console.log('\nAll UI tests passed!');
process.exit(0);
