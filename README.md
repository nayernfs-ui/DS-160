# nayernfs-ui

[![CI](https://github.com/nayernfs-ui/DS-160/actions/workflows/ci.yml/badge.svg)](https://github.com/nayernfs-ui/DS-160/actions/workflows/ci.yml)

This is the nayernfs-ui project.

Contains:

- `index.html`
- `script.js`
- `style.css`

Notable UI changes:

- **U.S. Visits** section now supports up to **5 entries** (repeatable visit history) and is fully implemented; keyboard navigation and add/remove behavior are verified by the live CI smoke test.

Brevo (SendinBlue) configuration and server email forwarding 🔧

- Recipient email: `nayer.nfs@gmail.com`

A GitHub Actions workflow (`.github/workflows/e2e.yml`) runs a live smoke test on push to `main` that exercises the U.S. Visits UI (add/remove up to 5 entries and keyboard navigation).

This project includes a serverless endpoint at `api/submit` that forwards form submissions to an email address via Brevo (SendinBlue). To enable it on Vercel / your host:

1. Create an **API Key** in your Brevo account (Menu → SMTP & API → API Keys) and add it to your project as `SENDINBLUE_API_KEY`.
2. Set `SENDER_EMAIL` to a valid verified sender address in your Brevo account (e.g., `"My App <no-reply@example.com>`) — this is used as the "From" address.
3. (Optional) Set `RECIPIENT_EMAIL` to change where messages are delivered (defaults to `nayer.nfa@gmail.com`).
4. Redeploy the project so the new environment variables are picked up.

Local development & testing 💡

- Example `.env` values are provided in `.env.example` (copy it to `.env` and fill values). **Do not** commit your `.env` file.
- Run `npm run check-env` to verify required env vars (`SENDINBLUE_API_KEY`, `SENDER_EMAIL`) for CI/local checks.
- For integration debugging without sending real emails, use `tools/test-email-stub.js` which stubs `sib-api-v3-sdk`'s `TransactionalEmailsApi.sendTransacEmail` and validates attachment contents (useful for DOCX attachment tests).
- Unit test for the health endpoint is available via `npm run test:api-health` (it asserts `SENDINBLUE_API_KEY` and `SENDER_EMAIL` are configured).

One-click test endpoint (safe usage)

- You can enable a one-time test endpoint at `/api/test-email` by setting `TEST_EMAIL_TOKEN` (copy `TEST_EMAIL_TOKEN` into your Vercel project settings or `.env` locally).
- Usage (safe):

```bash
# trigger via token in query
curl "https://<YOUR_DEPLOYMENT>/api/test-email?token=<YOUR_TEST_TOKEN>"

# or via header
curl -H "x-test-token: <YOUR_TEST_TOKEN>" "https://<YOUR_DEPLOYMENT>/api/test-email"
```

- The endpoint requires `SENDINBLUE_API_KEY`, `SENDER_EMAIL`, and either `TEST_RECIPIENT_EMAIL` or `RECIPIENT_EMAIL` to be set in the environment.
- Keep `TEST_EMAIL_TOKEN` secret. The endpoint validates the token and rejects requests without it (401) or when `TEST_EMAIL_TOKEN` is not configured (403).
- For CI safety, prefer running `node tools/test-email-stub.js` which runs the same `api/submit` code path but stubs network calls so no real email is sent.

How the endpoint works

- The client-side `script.js` gathers the form data and does a JSON POST to `/api/submit`.
- The serverless function `api/submit.js` uses `sib-api-v3-sdk` (SendinBlue / Brevo) to send the submission as an email.

Local testing (optional)

If you want to test locally, install the dependencies and run the Vercel dev server:

```powershell
cd D:\DS-160
npm install
npx vercel dev
```

Then submit the form at `http://localhost:3000` and watch the terminal logs for the serverless function output.

If you prefer a client-only approach without a server function, I can show the EmailJS (client) option instead.
