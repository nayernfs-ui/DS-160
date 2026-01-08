const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('military.test.js: starting');
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
  // Ensure init ran and test helpers are wired (robust against JSDOM timing)
  if (typeof dom.window.initDs160 === 'function' && !dom.window.__ds160Ready) {
    dom.window.initDs160();
    await new Promise((r) => setTimeout(r, 20));
  }
  const doc = dom.window.document;

  const militaryFields = doc.getElementById('militaryFields');
  assert(militaryFields, 'militaryFields container not found');

  console.log('military.test: __ds160Ready =', dom.window.__ds160Ready);
  console.log(
    'military.test: radios count =',
    doc.querySelectorAll('input[name="Military_Served"]').length
  );
  Array.from(doc.querySelectorAll('input[name="Military_Served"]')).forEach((r, i) => {
    console.log('military.test: radio', i, 'bound?', r.__ds160MilitaryBound || null);
  });

  // Initial State: hidden and aria attributes indicate collapsed
  assert(
    dom.window.getComputedStyle(militaryFields).display === 'none',
    'militaryFields should be hidden initially'
  );
  assert.strictEqual(
    militaryFields.getAttribute('aria-expanded'),
    'false',
    'militaryFields should have aria-expanded="false" initially'
  );
  // aria-hidden removed in favor of aria-expanded + disabling inputs to avoid hidden-focusable lint
  assert.strictEqual(
    militaryFields.getAttribute('aria-hidden'),
    null,
    'militaryFields should not have aria-hidden attribute initially'
  );

  // Gather controls inside the military fields
  const controls = militaryFields.querySelectorAll('input, select, textarea');

  // Inputs inside hidden sections should be disabled initially
  controls.forEach((c) => {
    assert(c.disabled, `Control ${c.id || c.name} should be disabled initially`);
  });

  // No inputs should be required initially
  controls.forEach((c) => {
    assert(
      !c.hasAttribute('required'),
      `Control ${c.id || c.name} should not be required initially`
    );
  });
  controls.forEach((c) => {
    assert(
      !c.hasAttribute('required'),
      `Control ${c.id || c.name} should not be required initially`
    );
  });

  // Toggle to Yes
  const yes = doc.querySelector('input[name="Military_Served"][value="Yes"]');
  assert(yes, 'Military_Served Yes radio not found');
  yes.checked = true;
  yes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert(
    dom.window.getComputedStyle(militaryFields).display !== 'none',
    'militaryFields should be visible after selecting Yes'
  );
  assert.strictEqual(
    militaryFields.getAttribute('aria-expanded'),
    'true',
    'militaryFields should have aria-expanded="true" when visible'
  );
  assert.strictEqual(
    militaryFields.getAttribute('aria-hidden'),
    null,
    'militaryFields should not have aria-hidden attribute when visible'
  );

  // Inputs should be enabled when visible
  controls.forEach((c) => {
    assert(!c.disabled, `Control ${c.id || c.name} should be enabled when visible`);
  });

  // Ensure common fields are required when visible
  const branch = doc.getElementById('militaryBranch');
  const fromYear = doc.getElementById('milServiceFromYear');
  assert(
    branch && branch.hasAttribute('required'),
    'Military_Branch should be required when militaryFields visible'
  );
  assert(
    fromYear && fromYear.hasAttribute('required'),
    'Military_ServiceFrom_Year should be required when militaryFields visible'
  );

  // Toggle to No
  const no = doc.querySelector('input[name="Military_Served"][value="No"]');
  assert(no, 'Military_Served No radio not found');
  no.checked = true;
  no.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert(
    dom.window.getComputedStyle(militaryFields).display === 'none',
    'militaryFields should be hidden after selecting No'
  );
  assert.strictEqual(
    militaryFields.getAttribute('aria-expanded'),
    'false',
    'militaryFields should have aria-expanded="false" after hiding'
  );
  assert.strictEqual(
    militaryFields.getAttribute('aria-hidden'),
    null,
    'militaryFields should not have aria-hidden attribute after hiding'
  );

  // Ensure inputs are disabled after hiding
  controls.forEach((c) => {
    assert(c.disabled, `Control ${c.id || c.name} should be disabled after hiding`);
  });

  // Ensure required attributes removed
  controls.forEach((c) => {
    assert(
      !c.hasAttribute('required'),
      `Control ${c.id || c.name} should not be required after hiding`
    );
  });

  console.log('military.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('military.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
