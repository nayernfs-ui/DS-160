const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('lost-passport.test.js: starting');
  const root = process.cwd();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');

  const cleanedHtml = html.replace(/<script[^>]*src="[^"]*script\.js[^"]*"[^>]*><\/script>/, '');
  const combined = cleanedHtml.replace('</body>', `<script>${script}</script></body>`);
  const dom = new JSDOM(combined, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: `file://${root.replace(/\\/g, '/')}/index.html`,
  });

  dom.window.addEventListener('error', (ev) => {
    console.error('JSDOM window error:', ev.error || ev.message || ev);
  });
  dom.window.addEventListener('unhandledrejection', (ev) => {
    console.error('JSDOM unhandledrejection:', ev.reason || ev);
  });

  await new Promise((r) => setTimeout(r, 50));
  const doc = dom.window.document;

  const lostFields = doc.getElementById('lostPassportFields');
  assert(lostFields, 'lostPassportFields container not found');

  // Initial State: hidden and aria attributes indicate collapsed
  assert(
    dom.window.getComputedStyle(lostFields).display === 'none',
    'lostPassportFields should be hidden initially'
  );
  assert.strictEqual(
    lostFields.getAttribute('aria-expanded'),
    'false',
    'lostPassportFields should have aria-expanded="false" initially'
  );
  // aria-hidden removed in favor of aria-expanded + disabling inputs to avoid hidden-focusable lint
  assert.strictEqual(
    lostFields.getAttribute('aria-hidden'),
    null,
    'lostPassportFields should not have aria-hidden attribute initially'
  );

  // ensure inputs are disabled initially
  const controlsArray = Array.from(controls);
  controlsArray.forEach((c) => {
    assert(c.disabled, `Control ${c.id || c.name} should be disabled initially`);
  });

  // No inputs should be required initially
  const controls = lostFields.querySelectorAll('input, select, textarea');
  controls.forEach((c) => {
    assert(
      !c.hasAttribute('required'),
      `Control ${c.id || c.name} should not be required initially`
    );
  });

  // Toggle to Yes
  const yes = doc.querySelector('input[name="LostPassport"][value="Yes"]');
  assert(yes, 'LostPassport Yes radio not found');
  yes.checked = true;
  yes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert(
    dom.window.getComputedStyle(lostFields).display !== 'none',
    'lostPassportFields should be visible after selecting Yes'
  );
  assert.strictEqual(
    lostFields.getAttribute('aria-expanded'),
    'true',
    'lostPassportFields should have aria-expanded="true" when visible'
  );
  assert.strictEqual(
    lostFields.getAttribute('aria-hidden'),
    null,
    'lostPassportFields should not have aria-hidden attribute when visible'
  );

  // ensure inputs are enabled when visible
  controlsArray.forEach((c) => {
    assert(!c.disabled, `Control ${c.id || c.name} should be enabled when visible`);
  });

  // Ensure passport number is required when visible (Do Not Know unchecked)
  const num = doc.getElementById('lostPassportNumber');
  assert(
    num && num.hasAttribute('required'),
    'LostPassport_PassportNumber should be required when fields visible'
  );

  // If Do Not Know checked, number should not be required
  const dn = doc.getElementById('lostPassportDoNotKnow');
  assert(dn, 'Do Not Know checkbox not found');
  dn.checked = true;
  dn.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert(
    !num.hasAttribute('required'),
    'Passport number should not be required when Do Not Know is checked'
  );

  // Toggle to No
  const no = doc.querySelector('input[name="LostPassport"][value="No"]');
  assert(no, 'LostPassport No radio not found');
  no.checked = true;
  no.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert(
    dom.window.getComputedStyle(lostFields).display === 'none',
    'lostPassportFields should be hidden after selecting No'
  );
  assert.strictEqual(
    lostFields.getAttribute('aria-expanded'),
    'false',
    'lostPassportFields should have aria-expanded="false" after hiding'
  );
  assert.strictEqual(
    lostFields.getAttribute('aria-hidden'),
    null,
    'lostPassportFields should not have aria-hidden attribute after hiding'
  );

  // ensure inputs are disabled after hiding
  controlsArray.forEach((c) => {
    assert(c.disabled, `Control ${c.id || c.name} should be disabled after hiding`);
  });

  // Ensure required attributes removed and Do Not Know unchecked
  controls.forEach((c) => {
    assert(
      !c.hasAttribute('required'),
      `Control ${c.id || c.name} should not be required after hiding`
    );
  });
  assert(dn && !dn.checked, 'Do Not Know should be unchecked after hiding');

  console.log('lost-passport.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('lost-passport.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
