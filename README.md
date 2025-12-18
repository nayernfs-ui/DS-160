# nayernfs-ui

This is the nayernfs-ui project.

Contains:

- `index.html`
- `script.js`
- `style.css`

Notable UI changes:

- **U.S. Visits** section now supports up to **5 entries** (repeatable visit history) and is fully implemented; keyboard navigation and add/remove behavior are verified by the live CI smoke test.

Deployment & server email forwarding (Vercel + SendinBlue)

- Recipient email: `nayer.nfs@gmail.com`

A GitHub Actions workflow (`.github/workflows/e2e.yml`) runs a live smoke test on push to `main` that exercises the U.S. Visits UI (add/remove up to 5 entries and keyboard navigation).

This project includes a serverless endpoint at `api/submit` that forwards form submissions to an email address via SendinBlue. To enable it on Vercel:

1. Add your SendinBlue (Brevo) API key in the Vercel project settings as an environment variable named `SENDINBLUE_API_KEY`.
2. (Optional) Set `RECIPIENT_EMAIL` to change where messages are sent. By default it uses `nayer.nfs@gmail.com`.
3. (Optional) Set `SENDER_EMAIL` to a valid verified sender address in your SendinBlue account. If not set, the function uses `no-reply@<your-project>.vercel.app`.
4. Redeploy the project (Vercel will install dependencies from `package.json`).

Local checks: you can run `npm run check-env` to verify required env vars (`SENDINBLUE_API_KEY`, `SENDER_EMAIL`) are present locally or in CI.

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
