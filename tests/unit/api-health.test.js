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

    // Note: tests live in tests/unit, so health module is two levels up
    require('../../api/health.js')({}, res);
    return captured;
  }

  // Case 1: both missing -> expect 500 + not_configured
  delete process.env.SENDINBLUE_API_KEY;
  delete process.env.SENDER_EMAIL;
  let r = callHandler();
  assert.strictEqual(r.status, 500, 'Should return 500 when keys missing');
  const body1 = JSON.parse(r.body);
  assert.strictEqual(body1.status, 'not_configured');
  assert(Array.isArray(body1.missing), 'missing should be an array');
  assert(body1.missing.includes('SENDINBLUE_API_KEY'));
  assert(body1.missing.includes('SENDER_EMAIL'));

  // Case 2: both present -> expect 200 + ok
  process.env.SENDINBLUE_API_KEY = 'x';
  process.env.SENDER_EMAIL = 'y@example.com';
  r = callHandler();
  assert.strictEqual(r.status, 200, 'Should return 200 when keys present');
  const body2 = JSON.parse(r.body);
  assert.strictEqual(body2.status, 'ok');

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
