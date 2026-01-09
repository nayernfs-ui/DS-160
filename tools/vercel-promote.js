#!/usr/bin/env node
const fetch = globalThis.fetch || require('node-fetch');
const { URL } = require('url');

async function run() {
  const VER_CLS = process.env.VERCEL_TOKEN;
  const verifyOnly = process.env.VERIFY_ONLY === '1' || process.env.VERIFY_ONLY === 'true';
  if (!VER_CLS && !verifyOnly) {
    console.log('VERCEL_TOKEN not set — running in dry-run mode, nothing to promote.');
    return 0;
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  let repo;
  let sha;

  if (!verifyOnly) {
    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN must be present in the environment (actions provides it).');
      return 1;
    }

    repo = process.env.GITHUB_REPOSITORY;
    sha = process.env.GITHUB_SHA;
    if (!repo || !sha) {
      console.error('GITHUB_REPOSITORY and GITHUB_SHA must be set by the workflow.');
      return 1;
    }
  }

  const previewAlias = process.env.PREVIEW_ALIAS || 'ds-160-fresh.vercel.app';
  const verifyMarker = process.env.VERIFY_MARKER || 'preview force-redeploy';
  const stylesheetPath = '/style.css?v=force-redeploy-20260108-2';

  if (verifyOnly) {
    console.log('VERIFY_ONLY mode: only verifying that alias points to up-to-date assets.');
    const maxVerifyRetries = parseInt(process.env.MAX_VERIFY_RETRIES || '8', 10);
    let verified = false;

    for (let i = 0; i < maxVerifyRetries; i++) {
      const delay = i * 3000;
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        console.log(
          `Verification attempt ${i + 1}/${maxVerifyRetries}: fetching https://${previewAlias}`
        );
        const resp = await fetch(`https://${previewAlias}`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        const html = await resp.text();
        if (html.includes(verifyMarker)) {
          console.log('Verification passed: marker found in preview HTML.');
          verified = true;
          break;
        }
        try {
          const cssResp = await fetch(`https://${previewAlias}${stylesheetPath}`, {
            headers: { 'Cache-Control': 'no-cache' },
          });
          if (cssResp.ok) {
            const cssText = await cssResp.text();
            if (
              cssText.includes("html[dir='rtl'] .question-group .options-row > label") ||
              cssText.includes('white-space: nowrap')
            ) {
              console.log('Verification passed: expected RTL rules found in deployed stylesheet.');
              verified = true;
              break;
            }
          }
        } catch (err) {
          console.log('Stylesheet fetch error during verification:', err.message);
        }

        console.log('Marker and stylesheet check not satisfied; HTTP status', resp.status);
      } catch (err) {
        console.log('Verification fetch error:', err.message);
      }
    }

    if (verified) {
      console.log('Verification successful: alias is serving up-to-date assets.');
      return 0;
    }

    console.error('Verification failed: alias appears to be stale.');
    return 2;
  }

  console.log(`Repository: ${repo} @ ${sha}`);

  // 1) Inspect commit statuses to find Vercel status with target_url
  const statusUrl = `https://api.github.com/repos/${repo}/commits/${sha}/status`;
  const stRes = await fetch(statusUrl, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'vercel-promote-script' },
  });
  if (!stRes.ok) {
    console.error('Failed to fetch commit statuses', await stRes.text());
    return 1;
  }
  const statusJson = await stRes.json();
  const statuses = statusJson.statuses || [];
  const vercelStatus = statuses.find(
    (s) => (s.context || '').toLowerCase().includes('vercel') && s.target_url
  );
  if (!vercelStatus) {
    console.error(
      'No Vercel status found for this commit. Statuses:',
      statuses.map((s) => s.context)
    );
    // Fail fast if we cannot discover a Vercel deployment URL
    return 1;
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
    return 1;
  }

  if (!deploymentId) {
    console.error(
      'Unable to extract deploymentId from Vercel target_url:',
      vercelStatus.target_url
    );
    return 1;
  }

  console.log('Deployment ID:', deploymentId);

  // 2) POST alias creation
  const aliasBody = { deploymentId, alias: previewAlias };
  console.log(`Requesting alias assignment: ${aliasBody.alias} -> ${aliasBody.deploymentId}`);

  const aliasRes = await fetch('https://api.vercel.com/v1/aliases', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VER_CLS}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(aliasBody),
  });

  const aliasText = await aliasRes.text();
  if (!aliasRes.ok) {
    console.error('Vercel alias assignment failed:', aliasRes.status, aliasText);
    return 1;
  }

  console.log('Alias assigned successfully:', aliasText);

  // 3) Verification: fetch the preview alias and check both HTML marker and stylesheet content
  const maxVerifyRetries = parseInt(process.env.MAX_VERIFY_RETRIES || '8', 10);
  let verified = false;

  for (let i = 0; i < maxVerifyRetries; i++) {
    const delay = i * 3000;
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      console.log(
        `Verification attempt ${i + 1}/${maxVerifyRetries}: fetching https://${previewAlias}`
      );
      const resp = await fetch(`https://${previewAlias}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const html = await resp.text();
      if (html.includes(verifyMarker)) {
        console.log('Verification passed: marker found in preview HTML.');
        verified = true;
        break;
      }
      // If no marker in HTML, fetch stylesheet and look for RTL rules as a secondary check
      try {
        const cssResp = await fetch(`https://${previewAlias}${stylesheetPath}`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (cssResp.ok) {
          const cssText = await cssResp.text();
          if (
            cssText.includes("html[dir='rtl'] .question-group .options-row > label") ||
            cssText.includes('white-space: nowrap')
          ) {
            console.log('Verification passed: expected RTL rules found in deployed stylesheet.');
            verified = true;
            break;
          }
        }
      } catch (err) {
        console.log('Stylesheet fetch error during verification:', err.message);
      }

      console.log('Marker and stylesheet check not satisfied; HTTP status', resp.status);
    } catch (err) {
      console.log('Verification fetch error:', err.message);
    }
  }

  if (verified) {
    console.log('Verification successful: promotion complete.');
    return 0;
  }

  console.error(
    'Failed to verify the preview after alias promotion — marker and stylesheet checks failed.'
  );

  // Create a GitHub issue to notify maintainers for manual intervention (best-effort)
  try {
    const issueBody = {
      title: `Vercel auto-promote failed for ${previewAlias}`,
      body: `The automated promotion for commit ${sha} to alias ${previewAlias} could not be verified. Please investigate. The script checked for marker: "${verifyMarker}" and stylesheet path: "${stylesheetPath}".`,
    };
    await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(issueBody),
    });
    console.log('Created GitHub issue to notify maintainers.');
  } catch (err) {
    console.log('Failed to create GitHub issue:', err.message);
  }

  return 2;
}

if (require.main === module) {
  run()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

module.exports = { run };
