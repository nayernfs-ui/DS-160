const nock = require('nock');
// Use node-fetch for tests so nock can intercept
globalThis.fetch = require('node-fetch');
const promote = require('../tools/vercel-promote');

async function run() {
  const repo = 'nayernfs-ui/DS-160';
  const sha = 'deadbeefcafefeed';

  nock('https://api.github.com')
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

  nock('https://api.vercel.com')
    .post('/v1/aliases', (body) => !!body.alias && !!body.deploymentId)
    .reply(200, { ok: true });

  nock('https://ds-160-fresh.vercel.app')
    .get('/')
    .reply(
      200,
      '<html><head><title>DS-160 Client Survey — preview force-redeploy-20260108-2</title></head><body>ok</body></html>'
    );

  const oldEnv = Object.assign({}, process.env);
  Object.assign(process.env, {
    VERCEL_TOKEN: 'fake-token',
    GITHUB_TOKEN: 'fake-token',
    PREVIEW_ALIAS: 'ds-160-fresh.vercel.app',
    VERIFY_MARKER: 'preview force-redeploy',
    GITHUB_REPOSITORY: repo,
    GITHUB_SHA: sha,
  });

  try {
    const code = await promote.run();
    console.log('promote.run() exit code:', code);
  } catch (err) {
    console.error('promote.run() threw:', err);
  } finally {
    Object.assign(process.env, oldEnv);
    nock.cleanAll();
  }
}

run();
