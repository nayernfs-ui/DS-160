// Integration test that sends a live email using configured secrets. Run only in gated CI.
const submit = require('../api/submit');

(async () => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not set; skipping integration email test');
      process.exit(0);
    }
    if (!process.env.RECIPIENT_EMAIL) {
      console.warn('RECIPIENT_EMAIL not set; skipping integration email test');
      process.exit(0);
    }

    const req = {
      method: 'POST',
      body: {
        FullName: 'Integration Test User',
        FirstName_Arabic: 'اختبار',
        ContactInformation: 'Integration flow',
      },
    };
    const res = {
      status: (s) => ({ json: (b) => console.log('RESPONSE', s, b) }),
    };

    console.log('Sending integration email — this will use real API credentials from env');
    await submit(req, res);
    console.log('email-integration: finished');
    process.exit(0);
  } catch (e) {
    console.error('email-integration: failed', e);
    process.exit(2);
  }
})();
