E2E trace runner

This folder contains helpers for capturing trace artifacts (screenshots, final HTML, and a captured payload) for E2E debugging.

How to run the trace runner locally:

1. Ensure dependencies are installed: `npm ci`.
2. Run the trace script: `TARGET_URL="https://ds-160-fresh.vercel.app/" node tests/e2e/puppeteer-relatives-trace.js`.
3. Artifacts will be saved to `tests/e2e/trace-output`.

How to run on CI (GitHub Actions):

- Use the `E2E Trace Artifacts` workflow (manual dispatch) to run the trace and upload artifacts. The workflow can be triggered at: `Actions -> E2E Trace Artifacts -> Run workflow` and accept an optional `TARGET_URL` input.

Notes:

- We keep `tests/e2e/trace-output/` ignored in the repository to avoid committing binary artifacts. The workflow uploads artifacts as a build artifact for review.
- If you prefer artifacts stored externally (e.g., S3, GCS), we can extend the workflow to upload them there instead of actions artifacts.
