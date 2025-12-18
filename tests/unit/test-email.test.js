const assert = require('assert');

(async function run() {
  console.log('test-email.test.js: starting');

  const origToken = process.env.TEST_EMAIL_TOKEN;
  const origSend = process.env.SENDINBLUE_API_KEY;
  const origSender = process.env.SENDER_EMAIL;
  const origRecipient = process.env.RECIPIENT_EMAIL;

  // Ensure the module is loaded fresh for each test
  delete require.cache[require.resolve('../../api/test-email')];
  const handler = require('../../api/test-email');

  // Helper to call handler and capture response
  function callHandler(qs = {}, headers = {}) {
    let captured = {};
    const req = { method: 'GET', query: qs, headers };
    const res = {
      status: (s) => ({ json: (b) => (captured = { status: s, body: b }) }),
      end(payload) {
        try {
          // try parse JSON
          const obj = typeof payload === 'string' ? JSON.parse(payload) : payload;
          captured = { status: res.statusCode || 200, body: obj };
        } catch (e) {
          captured = { status: res.statusCode || 200, body: payload };
        }
      },
      setHeader() {},
    };
    // Allow setting statusCode
    Object.defineProperty(res, 'statusCode', {
      set: function (v) {
        res._status = v;
      },
      get: function () {
        return res._status || 200;
      },
    });

    // Call handler synchronously if it doesn't use async, else await
    return handler(req, res)
      .then(() => captured)
      .catch((e) => ({ error: e }));
  }

  // Case 1: TEST_EMAIL_TOKEN not configured -> 403
  delete process.env.TEST_EMAIL_TOKEN;
  let r = await callHandler();
  assert.strictEqual(r.status, 403);

  // Case 2: Token present but missing required envs -> 500
  process.env.TEST_EMAIL_TOKEN = 'token123';
  delete process.env.SENDINBLUE_API_KEY;
  delete process.env.SENDER_EMAIL;
  delete process.env.RECIPIENT_EMAIL;
  r = await callHandler({ token: 'token123' });
  assert.strictEqual(r.status, 500);
  assert(Array.isArray(r.body.missing));

  // Case 3: Happy path (skip real network calls by setting SKIP_SEND)
  process.env.SENDINBLUE_API_KEY = 'x';
  process.env.SENDER_EMAIL = 'sender@example.com';
  process.env.RECIPIENT_EMAIL = 'recipient@example.com';
  process.env.SKIP_SEND = 'true';

  r = await callHandler({ token: 'token123' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.success, true);

  // Clean up
  delete process.env.SKIP_SEND;
  if (origToken !== undefined) process.env.TEST_EMAIL_TOKEN = origToken;
  else delete process.env.TEST_EMAIL_TOKEN;
  if (origSend !== undefined) process.env.SENDINBLUE_API_KEY = origSend;
  else delete process.env.SENDINBLUE_API_KEY;
  if (origSender !== undefined) process.env.SENDER_EMAIL = origSender;
  else delete process.env.SENDER_EMAIL;
  if (origRecipient !== undefined) process.env.RECIPIENT_EMAIL = origRecipient;
  else delete process.env.RECIPIENT_EMAIL;

  console.log('test-email.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('test-email.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
