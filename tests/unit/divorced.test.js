const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('divorced.test.js: starting');
  const root = process.cwd();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');

  // Remove remote resources to keep JSDOM self-contained
  let cleanedHtml = html.replace(/<link\b[^>]*href=['"][^'"]*style\.css[^'"]*['"][^>]*>/gi, '');
  cleanedHtml = cleanedHtml.replace(
    /<script\b[^>]*src=['"][^'"].*script\.js[^'"]*['"][^>]*>(?:<\/script>)?/gi,
    ''
  );
  const combined = cleanedHtml.replace('</body>', `<script>${script}</script></body>`);

  const dom = new JSDOM(combined, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/',
  });

  await new Promise((r) => setTimeout(r, 50));
  const doc = dom.window.document;
  // ensure DOMContentLoaded handlers run
  doc.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  const marital = doc.getElementById('maritalStatus');
  assert(marital, 'maritalStatus select not found');

  // Select Divorced and ensure block is visible and ARIA attributes are set
  marital.value = 'Divorced';
  marital.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  const divorced = doc.getElementById('divorcedFields');
  assert(divorced, 'divorcedFields not found');
  assert(
    dom.window.getComputedStyle(divorced).display !== 'none',
    'divorcedFields should be visible after selecting Divorced'
  );
  assert.strictEqual(divorced.getAttribute('aria-expanded'), 'true');
  assert.strictEqual(divorced.getAttribute('aria-hidden'), 'false');

  // Key fields should be required when divorced is selected
  const exName = doc.getElementById('exName');
  const divYear = doc.getElementById('dateOfDivorceYear');
  const nationality = doc.getElementById('nationality');
  assert(exName && exName.hasAttribute('required'), 'exName should be required when divorced');
  assert(
    divYear && divYear.hasAttribute('required'),
    'dateOfDivorceYear should be required when divorced'
  );
  assert(
    nationality && nationality.hasAttribute('required'),
    'nationality should be required when divorced'
  );

  // If required fields are empty, the form submission should be blocked by client-side validation
  const form = doc.getElementById('ds160Form');
  assert(form, 'form not found');

  // Ensure submission is cancelable and will be prevented when validation fails
  const res = form.dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );
  assert.strictEqual(
    res,
    false,
    'Form submission should be blocked when divorced required fields are empty'
  );

  // Now fill the required fields and attempt submission again; mock fetch to avoid network
  exName.value = 'Jane Doe';
  divYear.value = '2015';
  nationality.value = 'United States';

  form.setAttribute('data-use-ajax', 'true');
  dom.window.fetch = async () => ({ ok: true });

  const res2 = form.dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true })
  );
  // When validation passes, dispatchEvent should return true (not canceled)
  assert.strictEqual(
    res2,
    true,
    'Form submission should proceed when divorced required fields are filled'
  );

  // Test add/remove former spouse behavior: add until 5 entries and ensure add control disables
  const container = doc.getElementById('formerSpousesContainer');
  const addBtn = container.querySelector('.add-former-spouse');
  assert(addBtn, 'add-former-spouse control not found');

  // add 4 times to reach 5 entries (initially there is 1)
  for (let i = 2; i <= 5; i++) {
    addBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(
      container.querySelectorAll('.former-spouse.entry').length,
      i,
      `Expected ${i} former spouse entries`
    );
  }

  // add should be disabled when at max
  assert.strictEqual(
    addBtn.disabled,
    true,
    'add-former-spouse should be disabled when max reached'
  );

  // Remove one and ensure add becomes enabled
  const lastRem = container.querySelector(
    '.former-spouse.entry:last-of-type .remove-former-spouse'
  );
  lastRem.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(
    container.querySelectorAll('.former-spouse.entry').length,
    4,
    'After removal, there should be 4 entries'
  );
  assert.strictEqual(
    addBtn.disabled,
    false,
    'add-former-spouse should be enabled after removing to less than max'
  );

  console.log('divorced.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('divorced.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
