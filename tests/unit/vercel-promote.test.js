/*
Basic unit test for tools/vercel-promote.js using nock to mock GitHub and Vercel
Run locally: node tests/unit/vercel-promote.test.js
*/

const nock = require('nock');
const { spawnSync } = require('child_process');
const assert = require('assert');

async function main() {
  // Mock GitHub statuses
  const repo = 'nayernfs-ui/DS-160';
  const sha = 'deadbeefcafefeed';
  const gh = nock('https://api.github.com')
    .get(`/repos/${repo}/commits/${sha}/status`)
    .reply(200, {
      statuses: [
        { context: 'ci/circle', state: 'success' },
        { context: 'Vercel', state: 'success', target_url: 'https://vercel.com/nayer-raouf-projects/ds-160-fresh/abc123' }
      ]
    });

  // Mock Vercel alias creation
  const vc = nock('https://api.vercel.com')
    .post('/v1/aliases', body => !!body.alias && !!body.deploymentId)
    .reply(200, { ok: true });

  // Mock preview fetch
  const preview = nock('https://ds-160-fresh.vercel.app')
    .get('/')
    .reply(200, '<html><head><title>DS-160 Client Survey — preview force-redeploy-20260108-2</title></head><body>ok</body></html>');

  // Run the script with env
  const res = spawnSync('node', ['tools/vercel-promote.js'], {
    env: Object.assign({}, process.env, {
      VERCEL_TOKEN: 'fake-token',
      GITHUB_TOKEN: 'fake-token',
      PREVIEW_ALIAS: 'ds-160-fresh.vercel.app',
      VERIFY_MARKER: 'preview force-redeploy',
      GITHUB_REPOSITORY: repo,
      GITHUB_SHA: sha
    }),
    encoding: 'utf8'
  });

  console.log('STDOUT:\n', res.stdout);
  console.log('STDERR:\n', res.stderr);

  assert.strictEqual(res.status, 0, 'Script should exit 0 on success');
  console.log('Test passed.');
}

main().catch(err => { console.error(err); process.exit(1); });

// Second test: no marker in root but stylesheet contains RTL rules
async function main2() {
  const repo2 = 'nayernfs-ui/DS-160';
  const sha2 = 'beadfeedcafefeed';
  const gh2 = nock('https://api.github.com')
    .get(`/repos/${repo2}/commits/${sha2}/status`)
    .reply(200, {
      statuses: [
        { context: 'ci/circle', state: 'success' },
        { context: 'Vercel', state: 'success', target_url: 'https://vercel.com/nayer-raouf-projects/ds-160-fresh/def456' }
      ]
    });

  const vc2 = nock('https://api.vercel.com')
    .post('/v1/aliases', body => !!body.alias && !!body.deploymentId)
    .reply(200, { ok: true });

  const previewRoot = nock('https://ds-160-fresh.vercel.app')
    .get('/')
    .reply(200, '<html><head><title>Some other title</title></head><body>ok</body></html>');

  const previewCss = nock('https://ds-160-fresh.vercel.app')
    .get('/style.css?v=force-redeploy-20260108-2')
    .reply(200, 'html[dir="rtl"] .question-group .options-row > label { white-space: nowrap; }');

  const res2 = spawnSync('node', ['tools/vercel-promote.js'], {
    env: Object.assign({}, process.env, {
      VERCEL_TOKEN: 'fake-token',
      GITHUB_TOKEN: 'fake-token',
      PREVIEW_ALIAS: 'ds-160-fresh.vercel.app',
      VERIFY_MARKER: 'preview force-redeploy',
      GITHUB_REPOSITORY: repo2,
      GITHUB_SHA: sha2
    }),
    encoding: 'utf8'
  });

  console.log('STDOUT (test2):\n', res2.stdout);
  console.log('STDERR (test2):\n', res2.stderr);

  assert.strictEqual(res2.status, 0, 'Script should exit 0 on success when stylesheet has RTL rules');
  console.log('Second test passed.');
}

main2().catch(err => { console.error(err); process.exit(2); });

// Third test: VERIFY_ONLY mode should fail (exit 2) when both marker and stylesheet are missing
async function main3() {
  const previewRoot = nock('https://ds-160-fresh.vercel.app')
    .get('/')
    .reply(200, '<html><head><title>outdated</title></head><body>old</body></html>');

  const previewCss = nock('https://ds-160-fresh.vercel.app')
    .get('/style.css?v=force-redeploy-20260108-2')
    .reply(404, 'Not found');

  const res3 = spawnSync('node', ['tools/vercel-promote.js'], {
    env: Object.assign({}, process.env, {
      PREVIEW_ALIAS: 'ds-160-fresh.vercel.app',
      VERIFY_MARKER: 'preview force-redeploy',
      VERIFY_ONLY: '1'
    }),
    encoding: 'utf8'
  });

  console.log('STDOUT (test3):\n', res3.stdout);
  console.log('STDERR (test3):\n', res3.stderr);

  assert.strictEqual(res3.status, 2, 'Script should exit 2 when verify-only detects stale alias');
  console.log('Third test passed.');
}

main3().catch(err => { console.error(err); process.exit(3); });
