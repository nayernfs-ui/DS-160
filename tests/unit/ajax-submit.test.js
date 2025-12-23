const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('ajax-submit.test.js: starting');
  const root = process.cwd();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');

  let cleanedHtml = html.replace(
    /<script\b[^>]*src=['"][^'"]*script\.js[^'"]*['"][^>]*>(?:<\/script>)?/gi,
    ''
  );
  // remove any external stylesheet references to avoid network requests during JSDOM tests
  cleanedHtml = cleanedHtml.replace(/<link\b[^>]*href=['"][^'"]*style\.css[^'"]*['"][^>]*>/gi, '');
  // remove remote script tags (fallback)
  cleanedHtml = cleanedHtml.replace(/<script\b[^>]*src=['"][^'"]*['"][^>]*>(?:<\/script>)?/gi, '');
  const combined = cleanedHtml.replace('</body>', `<script>${script}</script></body>`);

  const dom = new JSDOM(combined, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/',
  });

  await new Promise((r) => setTimeout(r, 50));
  const doc = dom.window.document;
  // ensure any DOMContentLoaded handlers run (script registers its logic on DOMContentLoaded)
  doc.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  const form = doc.querySelector('form');
  assert(form, 'form not found');

  // Force AJAX submission path
  form.setAttribute('data-use-ajax', 'true');

  // Show relatives container and set fields
  const yesRadio = doc.querySelector('input[name="US_ImmediateRelatives"][value="Yes"]');
  yesRadio.checked = true;
  yesRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  const otherYes = doc.querySelector('input[name="US_OtherRelatives"][value="Yes"]');
  otherYes.checked = true;
  otherYes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  const s1 = doc.getElementById('Relative_1_Surnames');
  const g1 = doc.getElementById('Relative_1_GivenNames');
  assert(s1 && g1, 'relative inputs not found');
  s1.value = 'ALFA';
  g1.value = 'ONE';

  // Fill minimal required fields so client-side validation allows submit
  const fullName = doc.getElementById('fullName');
  if (fullName) fullName.value = 'Test User';
  const marital = doc.getElementById('maritalStatus');
  if (marital) marital.value = 'Single';

  // For unit testing the AJAX JSON generation, remove required attributes so validation does not block submission
  form.querySelectorAll('[required]').forEach((el) => el.removeAttribute('required'));

  // Mock fetch to capture payload
  let captured = null;
  dom.window.fetch = async (url, opts) => {
    try {
      captured = JSON.parse(opts.body);
    } catch (e) {
      // ignore parsing errors
    }
    return { ok: true };
  };

  // Submit the form programmatically
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  // wait for fetch handler
  await new Promise((r) => setTimeout(r, 120));

  assert(captured, 'fetch was not called or payload not captured');
  assert.strictEqual(
    captured['US_OtherRelatives'],
    'Yes',
    'US_OtherRelatives should be in AJAX payload'
  );
  assert.strictEqual(
    captured['Relative_1_Surnames'],
    'ALFA',
    'Relative_1_Surnames should be in AJAX payload'
  );

  console.log('ajax-submit.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('ajax-submit.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
