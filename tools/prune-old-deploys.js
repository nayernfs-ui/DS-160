#!/usr/bin/env node
const fetch = global.fetch || require('node-fetch');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const projectId = process.env.VERCEL_PROJECT_ID || 'prj_mCAzXtwH2RPFIGIjVDMuCHWxPR0h';
const token = process.env.VERCEL_TOKEN;
const PROD_ALIAS = 'ds-160-fresh.vercel.app';

const logPath = path.resolve(__dirname, 'prune.log');
// start fresh each run
try { fs.writeFileSync(logPath, `Prune run at ${new Date().toISOString()}\n`); } catch (e) {}
function writeLog(line) {
  const l = `${new Date().toISOString()} ${line}`;
  try { fs.appendFileSync(logPath, l + '\n'); } catch (err) {}
  console.log(line);
}

const DRY_RUN = !process.argv.includes('--yes') && process.env.FORCE_PRUNE !== '1';
const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

function createdMsFromRaw(createdRaw) {
  if (!createdRaw) return null;
  if (typeof createdRaw === 'number') return createdRaw > 1e12 ? createdRaw : createdRaw * 1000;
  const n = Number(createdRaw);
  if (!Number.isNaN(n)) return n > 1e12 ? n : n * 1000;
  return null;
}

async function apiPrune() {
  console.log('Using Vercel API to fetch deployments for project', projectId);
  const listRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!listRes.ok) {
    const text = await listRes.text();
    throw new Error(`Failed to list deployments: ${listRes.status} ${text}`);
  }
  const body = await listRes.json();
  const deployments = body.deployments || body;

  const candidates = deployments.filter((d) => {
    const aliases = d.alias || d.aliases || [];
    if (Array.isArray(aliases) && aliases.includes(PROD_ALIAS)) return false;
    const createdMs = createdMsFromRaw(d.createdAt || d.created || d.created_at || d.created_at_ms);
    if (!createdMs) return false;
    return createdMs < cutoff;
  });

  return { source: 'api', candidates };
}

function cliPrune() {
  console.log('Using Vercel CLI to fetch deployments (fallback)');
  let out;
  try {
    out = execSync('vercel list --json', { encoding: 'utf8' });
  } catch (err) {
    throw new Error('Failed to run `vercel list --json`: ' + (err && err.message));
  }
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (err) {
    // Older CLI versions may not output the same shape; try to recover
    throw new Error('Failed to parse JSON from `vercel list --json`: ' + (err && err.message));
  }
  const deployments = Array.isArray(parsed) ? parsed : parsed.deployments || [];

  const candidates = [];
  const skipped = [];
  for (const d of deployments) {
    const aliases = d.alias || d.aliases || [];
    const url = d.url || d.deployment || (d.aliases && d.aliases[0]) || d.name;
    if (Array.isArray(aliases) && aliases.includes(PROD_ALIAS)) {
      skipped.push({ reason: 'production-alias', url, id: d.uid || d.id });
      continue;
    }
    if (url === PROD_ALIAS) {
      skipped.push({ reason: 'production-url', url, id: d.uid || d.id });
      continue;
    }
    const createdMs = createdMsFromRaw(d.created || d.createdAt || d.created_at);
    if (!createdMs) {
      skipped.push({ reason: 'no-createdAt', url, id: d.uid || d.id });
      continue;
    }
    if (createdMs >= cutoff) {
      skipped.push({ reason: 'recent', url, id: d.uid || d.id, createdMs });
      continue;
    }
    candidates.push(d);
  }

  return { source: 'cli', candidates, skipped };
}

(async () => {
  try {
    let result;
    if (token) {
      result = await apiPrune();
    } else {
      result = cliPrune();
    }

    const candidates = result.candidates || [];
    const skipped = result.skipped || [];

    if (!candidates.length) {
      console.log('No old, non-production deployments found to remove.');
      if (skipped.length) {
        console.log('\nSkipped deployments (not eligible):');
        skipped.forEach((s) => console.log(`- ${s.url || s.id} (reason=${s.reason})`));
      }
      process.exit(0);
    }

    writeLog(`Found ${candidates.length} deployments eligible for removal (source=${result.source}):`);
    candidates.forEach((c) => writeLog(`- id=${c.uid || c.id || c.deploymentId || c.url} url=${c.url || c.deployment || c.name}`));

    if (skipped.length) {
      writeLog('\nSkipped deployments (not eligible):');
      skipped.forEach((s) => writeLog(`- ${s.url || s.id} (reason=${s.reason})`));
    }

    if (DRY_RUN) {
      writeLog('\nDRY RUN: No deployments were deleted. To actually delete, re-run with `--yes` or set FORCE_PRUNE=1.');
      process.exit(0);
    }

    console.log('\nDeleting deployments...');
    if (result.source === 'api') {
      for (const d of candidates) {
        const id = d.uid || d.id || d.deploymentId || d.name;
        if (!id) {
          console.warn('Skipping deployment with no id:', d);
          continue;
        }
        writeLog('EXECUTING: DELETE via API for ' + id);
        const res = await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const txt = await res.text().catch(() => '');
        writeLog('API response status: ' + res.status + ' ' + (txt ? txt.trim().slice(0, 200) : ''));
        if (!res.ok) {
          writeLog(`Failed to delete ${id}: ${res.status}`);
        } else {
          writeLog('Deleted ' + id);
        }
      }
    } else {
      for (const d of candidates) {
        const url = d.url || d.deployment || (d.aliases && d.aliases[0]) || d.name;
        if (!url) {
          console.warn('Skipping deployment with no url:', d);
          continue;
        }
        writeLog('EXECUTING: vercel rm ' + url);
        try {
          // Use spawnSync to capture stdout/stderr and non-zero exit codes
          const child = spawnSync('vercel', ['rm', url, '--yes'], { encoding: 'utf8' });
          if (child.stdout && child.stdout.trim()) writeLog('STDOUT: ' + child.stdout.trim());
          if (child.stderr && child.stderr.trim()) writeLog('STDERR: ' + child.stderr.trim());
          if (child.status !== 0) {
            writeLog('vercel rm exited with code ' + child.status + ' for ' + url);
          } else {
            writeLog('Deleted (CLI): ' + url);
          }
        } catch (err) {
          writeLog('Failed to remove ' + url + ': ' + (err && err.message ? err.message : err));
        }
      }
    }

    console.log('\nPrune complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error pruning deployments:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();