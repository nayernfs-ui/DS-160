/*
Basic unit test for tools/vercel-promote.js using nock to mock GitHub and Vercel
Run locally: node tests/unit/vercel-promote.test.js
*/

const nock = require('nock');
// Ensure tests use node-fetch so nock can intercept requests (Node native fetch uses undici)
globalThis.fetch = require('node-fetch');
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
        {
          context: 'Vercel',
          state: 'success',
          target_url: 'https://vercel.com/nayer-raouf-projects/ds-160-fresh/abc123',
        },
      ],
    });

  // Mock Vercel alias creation
  const vc = nock('https://api.vercel.com')
    .post('/v1/aliases', (body) => !!body.alias && !!body.deploymentId)
    .reply(200, { ok: true });

  // Mock preview fetch
  const preview = nock('https://ds-160-fresh.vercel.app')
    .get('/')
    .reply(
      200,
      '<html><head><title>DS-160 Client Survey — preview force-redeploy-20260108-2</title></head><body>ok</body></html>'
    );

  // Run the script in-process with mocked network
  const promote = require('../../tools/vercel-promote');
  const oldEnv = Object.assign({}, process.env);
  Object.assign(process.env, {
    VERCEL_TOKEN: 'fake-token',
    GITHUB_TOKEN: 'fake-token',
    PREVIEW_ALIAS: 'ds-160-fresh.vercel.app',
    VERIFY_MARKER: 'preview force-redeploy',
    GITHUB_REPOSITORY: repo,
    GITHUB_SHA: sha,
  });

  const exit = await promote.run();

  // restore env
  Object.assign(process.env, oldEnv);

  assert.strictEqual(exit, 0, 'Script should exit 0 on success');
  console.log('Test passed.');
  nock.cleanAll();
}

// Second test: no marker in root but stylesheet contains RTL rules
async function main2() {
  const repo2 = 'nayernfs-ui/DS-160';
  const sha2 = 'beadfeedcafefeed';
  const gh2 = nock('https://api.github.com')
    .get(`/repos/${repo2}/commits/${sha2}/status`)
    .reply(200, {
      statuses: [
        { context: 'ci/circle', state: 'success' },
        {
          context: 'Vercel',
          state: 'success',
          target_url: 'https://vercel.com/nayer-raouf-projects/ds-160-fresh/def456',
        },
      ],
    });

  const vc2 = nock('https://api.vercel.com')
    .post('/v1/aliases', (body) => !!body.alias && !!body.deploymentId)
    .reply(200, { ok: true });

  const previewRoot = nock('https://ds-160-fresh.vercel.app')
    .get('/')
    .reply(200, '<html><head><title>Some other title</title></head><body>ok</body></html>');

  const previewCss = nock('https://ds-160-fresh.vercel.app')
    .get('/style.css?v=force-redeploy-20260108-2')
    .reply(200, 'html[dir="rtl"] .question-group .options-row > label { white-space: nowrap; }');

  const promote = require('../../tools/vercel-promote');
  const oldEnv2 = Object.assign({}, process.env);
  Object.assign(process.env, {
    VERCEL_TOKEN: 'fake-token',
    GITHUB_TOKEN: 'fake-token',
    PREVIEW_ALIAS: 'ds-160-fresh.vercel.app',
    VERIFY_MARKER: 'preview force-redeploy',
    GITHUB_REPOSITORY: repo2,
    GITHUB_SHA: sha2,
  });

  const exit2 = await promote.run();

  // restore env
  Object.assign(process.env, oldEnv2);

  assert.strictEqual(exit2, 0, 'Script should exit 0 on success when stylesheet has RTL rules');
  console.log('Second test passed.');
  nock.cleanAll();
}

// Third test: VERIFY_ONLY mode should fail (exit 2) when both marker and stylesheet are missing
async function main3() {
  const previewRootScope = nock('https://ds-160-fresh.vercel.app').persist();
  previewRootScope
    .get('/')
    .reply(200, '<html><head><title>outdated</title></head><body>old</body></html>');

  const previewCssScope = nock('https://ds-160-fresh.vercel.app').persist();
  previewCssScope.get('/style.css?v=force-redeploy-20260108-2').reply(404, 'Not found');

  const promote = require('../../tools/vercel-promote');
  const oldEnv3 = Object.assign({}, process.env);
  Object.assign(process.env, {
    PREVIEW_ALIAS: 'ds-160-fresh.vercel.app',
    VERIFY_MARKER: 'preview force-redeploy',
    VERIFY_ONLY: '1',
    MAX_VERIFY_RETRIES: '3',
  });

  console.log('MAX_VERIFY_RETRIES (test3):', process.env.MAX_VERIFY_RETRIES);
  const exit3 = await promote.run();

  // restore env
  Object.assign(process.env, oldEnv3);

  assert.strictEqual(exit3, 2, 'Script should exit 2 when verify-only detects stale alias');
  console.log('Third test passed.');
  nock.cleanAll();
}

// Run tests sequentially to avoid nock interference
async function runAll() {
  await main();
  await main2();
  await main3();
}

runAll().catch((err) => {
  console.error(err);
  process.exit(4);
});
