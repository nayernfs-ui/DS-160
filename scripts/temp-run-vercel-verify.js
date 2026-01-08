const nock = require('nock');
// Ensure using node-fetch
globalThis.fetch = require('node-fetch');
const promote = require('../tools/vercel-promote');

async function run() {
  const previewRootScope = nock('https://ds-160-fresh.vercel.app').persist();
  previewRootScope
    .get('/')
    .reply(200, '<html><head><title>outdated</title></head><body>old</body></html>');

  const previewCssScope = nock('https://ds-160-fresh.vercel.app').persist();
  previewCssScope.get('/style.css?v=force-redeploy-20260108-2').reply(404, 'Not found');

  const oldEnv = Object.assign({}, process.env);
  Object.assign(process.env, {
    PREVIEW_ALIAS: 'ds-160-fresh.vercel.app',
    VERIFY_MARKER: 'preview force-redeploy',
    VERIFY_ONLY: '1',
    MAX_VERIFY_RETRIES: '3',
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
