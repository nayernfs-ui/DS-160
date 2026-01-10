// Isolated test for email sending path
const submit = require('../api/submit');

// Override the send wrapper to avoid network calls and to inspect payload
submit._sendTransacEmail = async function (payload) {
  console.log('STUBBED _sendTransacEmail called');
  if (!payload) throw new Error('No payload supplied');
  const att = payload.attachment && payload.attachment[0];
  if (!att) {
    console.log('No attachment present');
  } else {
    console.log('Attachment filename:', att.filename || att.name);
    const buf = Buffer.from(att.content, 'base64');
    console.log('Attachment size bytes:', buf.length);
  }
  // emulate success response
  return { ok: true };
};

// Prepare a fake request and response objects
const req = {
  method: 'POST',
  body: {
    FullName: 'محمد علي',
    FirstName_Arabic: 'محمد',
    LastName_Arabic: 'علي',
    ContactInformation: 'القاهرة',
  },
};
const res = {
  status: (s) => ({ json: (b) => console.log('RESPONSE', s, b) }),
};

(async () => {
  try {
    await submit(req, res);
    console.log('Isolation test finished');
  } catch (e) {
    console.error('Isolation test error', e);
    process.exitCode = 2;
  }
})();
