const assert = require('assert');

(async function run() {
  console.log('api-health.test.js: starting');
  const origSend = process.env.SENDINBLUE_API_KEY;
  const origSender = process.env.SENDER_EMAIL;

  // Helper to call handler and capture response
  function callHandler() {
    const captured = {};
    const res = {
      setHeader(k, v) {
        captured[k] = v;
      },
      end(payload) {
        captured.body = payload;
      },
      set statusCode(code) {
        captured.status = code;
      },
      get statusCode() {
        return captured.status;
      },
    };

    require('../api/health.js')({}, res);
    return captured;
  }

  // Case 1: both missing
  delete process.env.SENDINBLUE_API_KEY;
  delete process.env.SENDER_EMAIL;
  let r = callHandler();
  assert.strictEqual(r.status, 200);
  const body1 = JSON.parse(r.body);
  assert.strictEqual(body1.sendinblue, 'missing');
  assert.strictEqual(body1.sender, 'missing');

  // Case 2: both present
  process.env.SENDINBLUE_API_KEY = 'x';
  process.env.SENDER_EMAIL = 'y@example.com';
  r = callHandler();
  assert.strictEqual(r.status, 200);
  const body2 = JSON.parse(r.body);
  assert.strictEqual(body2.sendinblue, 'configured');
  assert.strictEqual(body2.sender, 'configured');

  // Restore env
  if (origSend !== undefined) process.env.SENDINBLUE_API_KEY = origSend;
  else delete process.env.SENDINBLUE_API_KEY;
  if (origSender !== undefined) process.env.SENDER_EMAIL = origSender;
  else delete process.env.SENDER_EMAIL;

  console.log('api-health.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('api-health.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
