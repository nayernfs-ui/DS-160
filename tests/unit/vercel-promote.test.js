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

  // Touch mocked variables to silence unused-variable warnings
  void gh;
  void vc;
  void preview;

  // Run the script with env
  const res = spawnSync('node', ['tools/vercel-promote.js'], {
    env: Object.assign({}, process.env, {
      VERCEL_TOKEN: 'fake-token',
      GITHUB_TOKEN: 'fake-token',
      PREVIEW_ALIAS: 'ds-160-fresh.vercel.app',
      VERIFY_MARKER: 'preview force-redeploy',
      GITHUB_REPOSITORY: repo,
      GITHUB_SHA: sha,
    }),
    encoding: 'utf8',
  });

  console.log('STDOUT:\n', res.stdout);
  console.log('STDERR:\n', res.stderr);

  assert.strictEqual(res.status, 0, 'Script should exit 0 on success');
  console.log('Test passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
