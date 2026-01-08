#!/usr/bin/env node
const fetch = globalThis.fetch || require('node-fetch');
const { URL } = require('url');

async function run() {
  const VER_CLS = process.env.VERCEL_TOKEN;
  if (!VER_CLS) {
    console.log('VERCEL_TOKEN not set — running in dry-run mode, nothing to promote.');
    process.exit(0);
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN must be present in the environment (actions provides it).');
    process.exit(1);
  }

  const repo = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  if (!repo || !sha) {
    console.error('GITHUB_REPOSITORY and GITHUB_SHA must be set by the workflow.');
    process.exit(1);
  }

  const previewAlias = process.env.PREVIEW_ALIAS || 'ds-160-fresh.vercel.app';
  const verifyMarker = process.env.VERIFY_MARKER || 'preview force-redeploy';

  console.log(`Repository: ${repo} @ ${sha}`);

  // 1) Inspect commit statuses to find Vercel status with target_url
  const statusUrl = `https://api.github.com/repos/${repo}/commits/${sha}/status`;
  const stRes = await fetch(statusUrl, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'vercel-promote-script' }
  });
  if (!stRes.ok) {
    console.error('Failed to fetch commit statuses', await stRes.text());
    process.exit(1);
  }
  const statusJson = await stRes.json();
  const statuses = statusJson.statuses || [];
  const vercelStatus = statuses.find(s => (s.context || '').toLowerCase().includes('vercel') && s.target_url);
  if (!vercelStatus) {
    console.error('No Vercel status found for this commit. Statuses:', statuses.map(s=>s.context));
    process.exit(1);
  }

  console.log('Found Vercel status:', vercelStatus.target_url);
  // Extract deployment id (assume last path segment of the target_url)
  let deploymentId;
  try {
    const u = new URL(vercelStatus.target_url);
    const parts = u.pathname.split('/').filter(Boolean);
    deploymentId = parts[parts.length - 1];
  } catch (err) {
    console.error('Failed to parse target_url:', err.message);
    process.exit(1);
  }

  if (!deploymentId) {
    console.error('Unable to extract deploymentId from Vercel target_url:', vercelStatus.target_url);
    process.exit(1);
  }

  console.log('Deployment ID:', deploymentId);

  // 2) POST alias creation
  const aliasBody = { deploymentId, alias: previewAlias };
  console.log(`Requesting alias assignment: ${aliasBody.alias} -> ${aliasBody.deploymentId}`);

  const aliasRes = await fetch('https://api.vercel.com/v1/aliases', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VER_CLS}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(aliasBody)
  });

  const aliasText = await aliasRes.text();
  if (!aliasRes.ok) {
    console.error('Vercel alias assignment failed:', aliasRes.status, aliasText);
    process.exit(1);
  }

  console.log('Alias assigned successfully:', aliasText);

  // 3) Verification: fetch the preview alias and look for the marker
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    const delay = i * 2000;
    if (delay) await new Promise(r => setTimeout(r, delay));
    try {
      console.log(`Verification attempt ${i + 1}/${maxRetries}: fetching https://${previewAlias}`);
      const resp = await fetch(`https://${previewAlias}`, { headers: { 'Cache-Control': 'no-cache' } });
      const html = await resp.text();
      if (html.includes(verifyMarker)) {
        console.log('Verification passed: marker found in preview HTML. Promotion complete.');
        process.exit(0);
      }
      console.log('Marker not found; HTTP status', resp.status);
    } catch (err) {
      console.log('Verification fetch error:', err.message);
    }
  }

  console.error('Failed to verify the preview after alias promotion — marker not found.');
  process.exit(2);
}

run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
