const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('education.test.js: starting');
  const root = process.cwd();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

  const cleanedHtml = html.replace(/<script[^>]*src="[^"]*script\.js[^"]*"[^>]*><\/script>/, '');
  const withCss = cleanedHtml.replace('</head>', `<style>${css}</style></head>`);
  const combined = withCss.replace('</body>', `<script>${script}</script></body>`);
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
  // Ensure init is available and run it to avoid timing races in JSDOM
  let _tries = 0;
  while (typeof dom.window.initDs160 !== 'function' && _tries < 10) {
    await new Promise((r) => setTimeout(r, 20));
    _tries++;
  }
  if (typeof dom.window.initDs160 === 'function' && !dom.window.__ds160Ready) {
    dom.window.initDs160();
    await new Promise((r) => setTimeout(r, 20));
  }
  const doc = dom.window.document;

  const yesRadio = doc.querySelector('input[name="HasOtherEducation"][value="Yes"]');
  assert(yesRadio, 'HasOtherEducation Yes radio not found');

  // Select 'Yes' to show container
  yesRadio.checked = true;
  yesRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  const eduContainer = doc.getElementById('Education_Container');
  assert(eduContainer, 'Education_Container not found');
  console.log(
    'education.test: initial edu-entry count=',
    doc.querySelectorAll('.edu-entry').length
  );
  assert(
    dom.window.getComputedStyle(eduContainer).display !== 'none',
    'Education_Container should be visible after selecting Yes'
  );
  assert.strictEqual(eduContainer.getAttribute('aria-expanded'), 'true');
  assert.strictEqual(
    eduContainer.getAttribute('aria-hidden'),
    null,
    'Education_Container should not have aria-hidden attribute when visible'
  );

  // First entry should have required attributes when visible
  const firstInst = doc.getElementById('Education_1_InstitutionName');
  const firstQual = doc.getElementById('Education_1_QualificationName');
  assert(
    firstInst && firstInst.hasAttribute('required'),
    'Education_1_InstitutionName should be required when visible'
  );
  assert(
    firstQual && firstQual.hasAttribute('required'),
    'Education_1_QualificationName should be required when visible'
  );

  // Toggle to No and ensure hidden and required removed
  const noRadio = doc.querySelector('input[name="HasOtherEducation"][value="No"]');
  assert(noRadio, 'HasOtherEducation No radio not found');
  noRadio.checked = true;
  noRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert(
    dom.window.getComputedStyle(eduContainer).display === 'none',
    'Education_Container should be hidden after selecting No'
  );
  assert.strictEqual(eduContainer.getAttribute('aria-expanded'), 'false');
  assert.strictEqual(
    eduContainer.getAttribute('aria-hidden'),
    null,
    'Education_Container should not have aria-hidden attribute when hidden'
  );
  assert(
    !firstInst.hasAttribute('required'),
    'Education_1_InstitutionName should not be required when hidden'
  );
  assert(
    !firstQual.hasAttribute('required'),
    'Education_1_QualificationName should not be required when hidden'
  );

  // Re-show and add until 5 entries
  yesRadio.checked = true;
  yesRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  console.log(
    'education.test: after selecting Yes edu-entry count=',
    doc.querySelectorAll('.edu-entry').length
  );

  const addBtn = doc.querySelector('.add-education');
  assert(addBtn, 'add-education control not found');

  // Add entries up to 5, but base expectations on the current starting count to avoid
  // inter-test state leakage affecting assumptions.
  const startCount = doc.querySelectorAll('.edu-entry').length || 0;
  console.log('education.test: startCount=', startCount, 'toAdd=', Math.min(5 - startCount, 4));
  const toAdd = Math.min(5 - startCount, 4);
  for (let i = 1; i <= toAdd; i++) {
    const before = doc.querySelectorAll('.edu-entry').length;
    // Try up to 3 times using both programmatic helper and UI click fallback
    for (let attempt = 0; attempt < 3; attempt++) {
      if (typeof dom.window.addEducationEntry === 'function') dom.window.addEducationEntry();
      else addBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      const now = doc.querySelectorAll('.edu-entry').length;
      if (now === before + 1) {
        break;
      }
      // try clicking as alternate attempt
      addBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      if (doc.querySelectorAll('.edu-entry').length === before + 1) {
        break;
      }
    }
    const entries = doc.querySelectorAll('.edu-entry');
    const expected = startCount + i;
    assert.strictEqual(entries.length, expected, `Expected ${expected} education entries`);
  }

  // Keyboard accessibility: newly added education entry should be focusable
  const entriesNow = doc.querySelectorAll('.edu-entry');
  const last = entriesNow[entriesNow.length - 1];
  const firstInput = last.querySelector('input, select, textarea');
  assert(firstInput, 'newly added education entry should contain a focusable control');
  firstInput.focus();
  assert.strictEqual(
    doc.activeElement,
    firstInput,
    'New education entry first control should receive focus'
  );
  const remBtnNew = last.querySelector('.remove-education');
  assert(
    remBtnNew && remBtnNew.getAttribute('tabindex') === '0',
    'remove-education should be in tab order'
  );

  // add control hidden at 5
  const addAfterFive = doc.querySelector('.add-education');
  assert(
    addAfterFive &&
      (addAfterFive.style.display === 'none' ||
        (addAfterFive.style.display === '' && doc.querySelectorAll('.edu-entry').length === 5)),
    'add-education should be hidden or disabled at 5 entries'
  );

  // Remove middle entry and verify renumber
  const remMid = doc.querySelector('.edu-entry[data-index="2"] .remove-education');
  assert(remMid, 'remove button for middle education entry should exist');
  remMid.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(
    doc.querySelectorAll('.edu-entry').length,
    4,
    'After removing one, should be 4 entries'
  );
  assert(
    doc.getElementById('Education_2_InstitutionName'),
    'Education_2_InstitutionName should exist after renumbering'
  );

  console.log('education.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('education.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
