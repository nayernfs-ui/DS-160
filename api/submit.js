const sgMail = require('@sendgrid/mail');

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

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'nayer.nfs@gmail.com';
  const SENDER_EMAIL = process.env.SENDER_EMAIL || `no-reply@${process.env.VERCEL_URL || 'vercel.app'}`;

  if (!SENDGRID_API_KEY) {
    res.status(500).json({ error: 'SENDGRID_API_KEY is not configured' });
    return;
  }

  sgMail.setApiKey(SENDGRID_API_KEY);

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

  const msg = {
    to: RECIPIENT_EMAIL,
    from: SENDER_EMAIL,
    subject: 'DS-160 Form Submission',
    text,
    html
  };

  try {
    await sgMail.send(msg);
    res.status(200).json({ ok: true, message: 'Email sent' });
  } catch (err) {
    console.error('SendGrid error:', err);
    // SendGrid may return detailed error in err.response.body
    const detail = err && err.response && err.response.body ? err.response.body : err.message || err;
    res.status(500).json({ error: 'Failed to send email', detail });
  }
};
