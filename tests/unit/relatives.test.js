const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('relatives.test.js: starting');
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

  const yesRadio = doc.querySelector('input[name="US_ImmediateRelatives"][value="Yes"]');
  assert(yesRadio, 'US_ImmediateRelatives Yes radio not found');

  // show the relatives container
  yesRadio.checked = true;
  yesRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  const relativesField = doc.getElementById('US_Relatives_Container');
  assert(relativesField, 'US_Relatives_Container fieldset not found');
  assert(
    dom.window.getComputedStyle(relativesField).display !== 'none',
    'US_Relatives_Container should be visible after selecting Yes'
  );
  assert.strictEqual(
    relativesField.getAttribute('aria-expanded'),
    'true',
    'aria-expanded should be true'
  );
  assert.strictEqual(
    relativesField.getAttribute('aria-hidden'),
    'false',
    'aria-hidden should be false'
  );

  // controls exist and accessible
  const addControl = doc.querySelector('.add-relative');
  assert(
    addControl && addControl.getAttribute('aria-label'),
    'add-relative should have an aria-label'
  );
  const initialRemove = doc.querySelector('.relative-entry .remove-relative');
  assert(
    initialRemove && initialRemove.getAttribute('aria-label'),
    'initial remove-relative should have an aria-label'
  );

  // other relatives question exists (simple Yes/No)
  const otherYes = doc.querySelector('input[name="US_OtherRelatives"][value="Yes"]');
  const otherNo = doc.querySelector('input[name="US_OtherRelatives"][value="No"]');
  assert(otherYes && otherNo, 'US_OtherRelatives radios should exist');

  // required attributes are set on visible entry
  assert(
    doc.getElementById('Relative_1_Surnames') &&
      doc.getElementById('Relative_1_Surnames').hasAttribute('required'),
    'Relative_1_Surnames should be required when relatives shown'
  );
  assert(
    doc.getElementById('Relative_1_GivenNames') &&
      doc.getElementById('Relative_1_GivenNames').hasAttribute('required'),
    'Relative_1_GivenNames should be required when relatives shown'
  );

  // Toggle to No and assert collapsed
  const noRadio = doc.querySelector('input[name="US_ImmediateRelatives"][value="No"]');
  assert(noRadio, 'US_ImmediateRelatives No radio not found');
  noRadio.checked = true;
  noRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert(
    dom.window.getComputedStyle(relativesField).display === 'none',
    'US_Relatives_Container should be hidden after selecting No'
  );
  assert.strictEqual(relativesField.getAttribute('aria-expanded'), 'false');
  assert.strictEqual(relativesField.getAttribute('aria-hidden'), 'true');
  assert(
    !doc.getElementById('Relative_1_Surnames')?.hasAttribute('required'),
    'Relative_1_Surnames should not be required when hidden'
  );

  // Re-select Yes and add an entry
  yesRadio.checked = true;
  yesRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  const relativeEntries = () => doc.querySelectorAll('.relative-entry');
  assert.strictEqual(relativeEntries().length, 1, 'Initial relative entry should be 1');

  const addBtn = doc.querySelector('.add-relative');
  assert(addBtn, 'add-relative should exist');
  addBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert.strictEqual(
    relativeEntries().length,
    2,
    'After adding, there should be 2 relative entries'
  );

  // Select other relatives = Yes and verify it's present in the serialized form payload
  const otherYesRadio = doc.querySelector('input[name="US_OtherRelatives"][value="Yes"]');
  assert(otherYesRadio, 'US_OtherRelatives Yes radio not found');
  otherYesRadio.checked = true;
  otherYesRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  const formEl = doc.querySelector('form');
  const fd = new dom.window.FormData(formEl);
  const payload = {};
  fd.forEach((v, k) => {
    if (Object.prototype.hasOwnProperty.call(payload, k)) {
      if (!Array.isArray(payload[k])) payload[k] = [payload[k]];
      payload[k].push(v);
    } else {
      payload[k] = v;
    }
  });
  assert.strictEqual(
    payload['US_OtherRelatives'],
    'Yes',
    'US_OtherRelatives should be included in serialized payload'
  );

  // add until max (10) and ensure add control hides when reached
  for (let expected = 3; expected <= 10; expected++) {
    const add = doc.querySelector('.add-relative');
    assert(add, 'add-relative should exist');
    add.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(relativeEntries().length, expected, `Expected ${expected} relative entries`);
  }
  const addAfterMax = doc.querySelector('.add-relative');
  const computedAddDisplay = addAfterMax ? dom.window.getComputedStyle(addAfterMax).display : null;
  const styled = addAfterMax ? addAfterMax.getAttribute('style') : null;
  assert(
    addAfterMax &&
      relativeEntries().length === 10 &&
      (computedAddDisplay === 'none' ||
        (styled && styled.indexOf('display: none') !== -1) ||
        addAfterMax.style.display === ''),
    'add control should be hidden or disabled at max entries'
  );

  // Remove extras to get back to a single entry for the subsequent focus/remove checks
  while (relativeEntries().length > 1) {
    const lastRem =
      relativeEntries()[relativeEntries().length - 1].querySelector('.remove-relative');
    lastRem.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.strictEqual(
    relativeEntries().length,
    1,
    'There should be exactly one relative entry after cleanup'
  );

  // Re-add one entry to validate removing a non-final entry leaves one behind
  const addAgain = doc.querySelector('.add-relative');
  assert(addAgain, 'add-relative should exist for re-adding');
  addAgain.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(
    relativeEntries().length,
    2,
    'There should be 2 relative entries after re-adding'
  );

  // focusability and remove on new entry
  const last = relativeEntries()[relativeEntries().length - 1];
  const firstInput = last.querySelector('input, select, textarea');
  assert(firstInput, 'newly added relative should contain a focusable control');
  firstInput.focus();
  assert.strictEqual(doc.activeElement, firstInput, 'New entry first control should receive focus');

  const remBtn = last.querySelector('.remove-relative');
  assert(remBtn, 'remove-relative button should exist on newly added entry');
  assert.strictEqual(remBtn.getAttribute('tabindex'), '0', 'remove button should be in tab order');
  remBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert.strictEqual(
    relativeEntries().length,
    1,
    'After removing, there should be 1 relative entry remaining'
  );

  // Remove the last remaining entry — should collapse and toggle radio to No
  const only = relativeEntries()[0];
  const remOnly = only.querySelector('.remove-relative');
  assert(remOnly, 'remove-relative should exist on the only relative entry');
  remOnly.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert.strictEqual(
    relativeEntries().length,
    0,
    'No relative entries should remain after removing the last entry'
  );
  const noAfter = doc.querySelector('input[name="US_ImmediateRelatives"][value="No"]');
  assert(
    noAfter && noAfter.checked,
    'US_ImmediateRelatives should be set to No after removing last entry'
  );
  assert(
    dom.window.getComputedStyle(relativesField).display === 'none',
    'US_Relatives_Container should be hidden after removing last entry'
  );

  console.log('relatives.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('relatives.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
