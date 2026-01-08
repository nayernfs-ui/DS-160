# Vercel Auto-Promote Automation

This repository includes a GitHub Action that can automatically promote the latest Vercel deployment to the preview alias (`ds-160-fresh`) when commits land or PRs are merged.

How it works
- The action runs on push to `main`, on merged PRs, and can run on a schedule.
- The action runs `tools/vercel-promote.js`, which inspects the current commit's statuses to find the Vercel target URL, extracts the deployment id, and requests Vercel to assign the preview alias.
- After alias assignment the script verifies that the preview HTML contains the expected verification marker (by default `preview force-redeploy`).

Secrets required (one-time setup)
- `VERCEL_TOKEN` — a Vercel service token with permissions to create aliases (add in GitHub → Settings → Secrets → Actions).
- (Optional) `PREVIEW_ALIAS` — override the preview alias (default: `ds-160-fresh.vercel.app`).

Testing
- A basic unit test is provided at `tests/unit/vercel-promote.test.js` which uses `nock` to mock GitHub and Vercel APIs. Run it with:

  node tests/unit/vercel-promote.test.js

Security
- Use a Vercel service token with minimal privileges and rotate/revoke it if compromised.
