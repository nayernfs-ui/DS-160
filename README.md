# nayernfs-ui

This is the nayernfs-ui project.

Contains:
- `index.html`
- `script.js`
- `style.css`

Deployment & server email forwarding (Vercel + SendGrid)

- Recipient email: `nayer.nfs@gmail.com`

This project includes a serverless endpoint at `api/submit` that forwards form submissions to an email address via SendGrid. To enable it on Vercel:

1. Add your SendGrid API key in the Vercel project settings as an environment variable named `SENDGRID_API_KEY`.
2. (Optional) Set `RECIPIENT_EMAIL` to change where messages are sent. By default it uses `nayer.nfs@gmail.com`.
3. (Optional) Set `SENDER_EMAIL` to a valid verified sender address in your SendGrid account. If not set, the function uses `no-reply@<your-project>.vercel.app`.
4. Redeploy the project (Vercel will install dependencies from `package.json`).

How the endpoint works

- The client-side `script.js` gathers the form data and does a JSON POST to `/api/submit`.
- The serverless function `api/submit.js` uses `@sendgrid/mail` to send the submission as an email.

Local testing (optional)

If you want to test locally, install the dependencies and run the Vercel dev server:

```powershell
cd D:\DS-160
npm install
npx vercel dev
```

Then submit the form at `http://localhost:3000` and watch the terminal logs for the serverless function output.

If you prefer a client-only approach without a server function, I can show the EmailJS (client) option instead.
