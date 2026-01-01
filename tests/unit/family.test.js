const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('family.test.js: starting');
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

  // Father fields
  const fatherYes = doc.querySelector('input[name="Father_In_US"][value="Yes"]');
  const fatherNo = doc.querySelector('input[name="Father_In_US"][value="No"]');
  assert(fatherYes, 'Father In US Yes radio not found');
  assert(fatherNo, 'Father In US No radio not found');

  const fatherStatus = doc.getElementById('fatherStatus');
  assert(fatherStatus, 'fatherStatus select not found');
  const fatherOptions = Array.from(fatherStatus.options).map((o) => o.value);
  assert(fatherOptions.includes('US_Citizen'), 'fatherStatus should include US_Citizen option');
  assert(fatherOptions.includes('LPR'), 'fatherStatus should include LPR option');

  const fatherStatusGroup = doc.getElementById('fatherStatusGroup');
  assert(fatherStatusGroup, 'fatherStatusGroup container not found');
  // Initially hidden
  assert.strictEqual(
    dom.window.getComputedStyle(fatherStatusGroup).display,
    'none',
    'fatherStatusGroup should be hidden initially'
  );
  assert.strictEqual(
    fatherStatusGroup.getAttribute('aria-expanded'),
    'false',
    'fatherStatusGroup should have aria-expanded=false initially'
  );
  assert(!fatherStatus.hasAttribute('required'), 'fatherStatus should not be required initially');

  // Show when Yes selected
  fatherYes.checked = true;
  fatherYes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.notStrictEqual(
    dom.window.getComputedStyle(fatherStatusGroup).display,
    'none',
    'fatherStatusGroup should be visible after selecting Yes'
  );
  assert.strictEqual(
    fatherStatusGroup.getAttribute('aria-expanded'),
    'true',
    'fatherStatusGroup should have aria-expanded=true when visible'
  );
  assert(
    fatherStatus.hasAttribute('required'),
    'fatherStatus should be required when father in US is Yes'
  );

  // Hide when No selected
  fatherNo.checked = true;
  fatherNo.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(
    dom.window.getComputedStyle(fatherStatusGroup).display,
    'none',
    'fatherStatusGroup should be hidden after selecting No'
  );
  assert.strictEqual(
    fatherStatusGroup.getAttribute('aria-expanded'),
    'false',
    'fatherStatusGroup should have aria-expanded=false when hidden'
  );
  assert(
    !fatherStatus.hasAttribute('required'),
    'fatherStatus should not be required when father in US is No'
  );

  // Mother fields
  const motherYes = doc.querySelector('input[name="Mother_In_US"][value="Yes"]');
  const motherNo = doc.querySelector('input[name="Mother_In_US"][value="No"]');
  assert(motherYes, 'Mother In US Yes radio not found');
  assert(motherNo, 'Mother In US No radio not found');

  const motherStatus = doc.getElementById('motherStatus');
  assert(motherStatus, 'motherStatus select not found');
  const motherOptions = Array.from(motherStatus.options).map((o) => o.value);
  assert(motherOptions.includes('US_Citizen'), 'motherStatus should include US_Citizen option');
  assert(motherOptions.includes('LPR'), 'motherStatus should include LPR option');

  const motherStatusGroup = doc.getElementById('motherStatusGroup');
  assert(motherStatusGroup, 'motherStatusGroup container not found');
  // Initially hidden
  assert.strictEqual(
    dom.window.getComputedStyle(motherStatusGroup).display,
    'none',
    'motherStatusGroup should be hidden initially'
  );
  assert.strictEqual(
    motherStatusGroup.getAttribute('aria-expanded'),
    'false',
    'motherStatusGroup should have aria-expanded=false initially'
  );
  assert(!motherStatus.hasAttribute('required'), 'motherStatus should not be required initially');

  // Show when Yes selected
  motherYes.checked = true;
  motherYes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.notStrictEqual(
    dom.window.getComputedStyle(motherStatusGroup).display,
    'none',
    'motherStatusGroup should be visible after selecting Yes'
  );
  assert.strictEqual(
    motherStatusGroup.getAttribute('aria-expanded'),
    'true',
    'motherStatusGroup should have aria-expanded=true when visible'
  );
  assert(
    motherStatus.hasAttribute('required'),
    'motherStatus should be required when mother in US is Yes'
  );

  // Hide when No selected
  motherNo.checked = true;
  motherNo.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(
    dom.window.getComputedStyle(motherStatusGroup).display,
    'none',
    'motherStatusGroup should be hidden after selecting No'
  );
  assert.strictEqual(
    motherStatusGroup.getAttribute('aria-expanded'),
    'false',
    'motherStatusGroup should have aria-expanded=false when hidden'
  );
  assert(
    !motherStatus.hasAttribute('required'),
    'motherStatus should not be required when mother in US is No'
  );

  // Spouse fields (marital status)
  const maritalStatus = doc.getElementById('maritalStatus');
  assert(maritalStatus, 'maritalStatus select not found');
  const marriedGroup = doc.getElementById('spouseInfo');
  assert(marriedGroup, 'spouseInfo container not found');
  const spouseAddr = doc.getElementById('spouseCurrentAddress');
  assert(spouseAddr, 'spouseCurrentAddress input not found');

  // Initially hidden and not required
  assert.strictEqual(
    dom.window.getComputedStyle(marriedGroup).display,
    'none',
    'spouseInfo should be hidden initially'
  );
  assert.strictEqual(
    marriedGroup.getAttribute('aria-expanded'),
    'false',
    'spouseInfo should have aria-expanded=false initially'
  );
  assert(
    !spouseAddr.hasAttribute('required'),
    'spouseCurrentAddress should not be required initially'
  );

  // Show when Married selected
  maritalStatus.value = 'Married';
  maritalStatus.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.notStrictEqual(
    dom.window.getComputedStyle(marriedGroup).display,
    'none',
    'spouseInfo should be visible after selecting Married'
  );
  assert.strictEqual(
    marriedGroup.getAttribute('aria-expanded'),
    'true',
    'spouseInfo should have aria-expanded=true when visible'
  );
  assert(
    spouseAddr.hasAttribute('required'),
    'spouseCurrentAddress should be required when married'
  );

  // Hide when Single selected
  maritalStatus.value = 'Single';
  maritalStatus.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(
    dom.window.getComputedStyle(marriedGroup).display,
    'none',
    'spouseInfo should be hidden after selecting Single'
  );
  assert.strictEqual(
    marriedGroup.getAttribute('aria-expanded'),
    'false',
    'spouseInfo should have aria-expanded=false when hidden'
  );
  assert(
    !spouseAddr.hasAttribute('required'),
    'spouseCurrentAddress should not be required when not married'
  );

  // Selecting Widowed should show the widowed details and not require spouse address
  const widowedGroup = doc.getElementById('widowInfo');
  maritalStatus.value = 'Widowed';
  maritalStatus.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.notStrictEqual(
    dom.window.getComputedStyle(widowedGroup).display,
    'none',
    'widowedFields should be visible after selecting Widowed'
  );
  assert.strictEqual(
    widowedGroup.getAttribute('aria-expanded'),
    'true',
    'widowedFields should have aria-expanded=true when visible'
  );
  assert(
    !spouseAddr.hasAttribute('required'),
    'spouseCurrentAddress should not be required when widowed'
  );

  // Selecting Married should explicitly hide the widowed details
  maritalStatus.value = 'Married';
  maritalStatus.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(
    dom.window.getComputedStyle(widowedGroup).display,
    'none',
    'widowInfo should be hidden when Married selected'
  );

  // spouse DOB fields should be required when married
  const spouseDOBDay = doc.getElementById('spouseDOBDay');
  const spouseDOBMonth = doc.getElementById('spouseDOBMonth');
  const spouseDOBYear = doc.getElementById('spouseDOBYear');
  assert(
    spouseDOBDay && spouseDOBDay.hasAttribute('required'),
    'spouseDOBDay should be required when married'
  );
  assert(
    spouseDOBMonth && spouseDOBMonth.hasAttribute('required'),
    'spouseDOBMonth should be required when married'
  );
  assert(
    spouseDOBYear && spouseDOBYear.hasAttribute('required'),
    'spouseDOBYear should be required when married'
  );

  // When Widowed is selected, spouse DOBs should not be required
  maritalStatus.value = 'Widowed';
  maritalStatus.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert(
    !spouseDOBDay.hasAttribute('required'),
    'spouseDOBDay should not be required when widowed'
  );

  console.log('family.test.js: passed');
})();
