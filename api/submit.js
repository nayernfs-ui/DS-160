const SibApiV3Sdk = require('sib-api-v3-sdk');

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const SENDINBLUE_API_KEY = process.env.SENDINBLUE_API_KEY;
  const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'nayer.nfs@gmail.com';
  const SENDER_EMAIL = process.env.SENDER_EMAIL || `no-reply@${process.env.VERCEL_URL || 'vercel.app'}`;
  if (!SENDINBLUE_API_KEY) {
    res.status(500).json({ error: 'SENDINBLUE_API_KEY is not configured' });
    return;
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = SENDINBLUE_API_KEY;
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const data = req.body || {};

  // Build HTML and text versions of the submission
  let html = '<h2>New DS-160 Submission</h2><ul>';
  let text = 'New DS-160 Submission\n\n';

  for (const key of Object.keys(data)) {
    const value = Array.isArray(data[key]) ? data[key].join(', ') : String(data[key]);
    html += `<li><strong>${escapeHtml(key)}</strong>: ${escapeHtml(value)}</li>`;
    text += `${key}: ${value}\n`;
  }

  html += '</ul>';

  const sendSmtpEmail = {
    to: [{ email: RECIPIENT_EMAIL }],
    sender: { email: SENDER_EMAIL },
    subject: 'DS-160 Form Submission',
    htmlContent: html,
    textContent: text
  };

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    res.status(200).json({ ok: true, message: 'Email sent' });
  } catch (err) {
    console.error('SendinBlue error:', err);
    const detail = err && err.response ? err.response.body : err.message || err;
    res.status(500).json({ error: 'Failed to send email', detail });
  }
};
