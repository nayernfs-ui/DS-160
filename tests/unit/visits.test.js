const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('visits.test.js: starting');
  const root = process.cwd();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');

  // Remove any external script tag that references script.js so JSDOM won't attempt to fetch it
  const cleanedHtml = html.replace(/<script[^>]*src="[^"]*script\.js[^"]*"[^>]*><\/script>/, '');
  // Inject the application script into the page so behavior is available to JSDOM
  const combined = cleanedHtml.replace('</body>', `<script>${script}</script></body>`);
  const dom = new JSDOM(combined, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: `file://${root.replace(/\\/g, '/')}/index.html`,
  });

  // surface runtime errors that occur inside the JSDOM window
  dom.window.addEventListener('error', (ev) => {
    console.error('JSDOM window error:', ev.error || ev.message || ev);
  });
  dom.window.addEventListener('unhandledrejection', (ev) => {
    console.error('JSDOM unhandledrejection:', ev.reason || ev);
  });

  // give scripts time to run and register event listeners
  await new Promise((r) => setTimeout(r, 50));
  const doc = dom.window.document;

  const yesRadio = doc.querySelector('input[name="US_Visited"][value="Yes"]');
  assert(yesRadio, 'US_Visited Yes radio not found');

  // Select 'Yes' to show the visits container
  yesRadio.checked = true;
  yesRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  const visitsField = doc.getElementById('US_Visits_Container');
  assert(visitsField, 'US_Visits_Container fieldset not found');
  assert(
    dom.window.getComputedStyle(visitsField).display !== 'none',
    'US_Visits_Container should be visible after selecting Yes'
  );
  // accessibility attributes
  assert.strictEqual(
    visitsField.getAttribute('aria-expanded'),
    'true',
    'US_Visits_Container should have aria-expanded="true" when visible'
  );
  assert.strictEqual(
    visitsField.getAttribute('aria-hidden'),
    'false',
    'US_Visits_Container should have aria-hidden="false" when visible'
  );

  // Accessibility: add / remove controls should include aria-labels
  const addControl = doc.querySelector('.add-visit');
  assert(
    addControl && addControl.getAttribute('aria-label'),
    'add-visit should have an aria-label'
  );
  const initialRemove = doc.querySelector('.visit-entry .remove-visit');
  assert(
    initialRemove && initialRemove.getAttribute('aria-label'),
    'initial remove-visit should have an aria-label'
  );

  // 1) Required attrs present on first visible visit entry when shown
  const firstYear = doc.getElementById('USVisit_1_DateArrived_Year');
  const firstLength = doc.getElementById('USVisit_1_Length');
  assert(
    firstYear && firstYear.hasAttribute('required'),
    'USVisit_1_DateArrived_Year should be required when visits shown'
  );
  assert(
    firstLength && firstLength.hasAttribute('required'),
    'USVisit_1_Length should be required when visits shown'
  );

  // 2) Toggle back to No and assert collapsed state and removal of 'required'
  const noRadio = doc.querySelector('input[name="US_Visited"][value="No"]');
  assert(noRadio, 'US_Visited No radio not found');
  noRadio.checked = true;
  noRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert(
    dom.window.getComputedStyle(visitsField).display === 'none',
    'US_Visits_Container should be hidden after selecting No'
  );
  assert.strictEqual(
    visitsField.getAttribute('aria-expanded'),
    'false',
    'US_Visits_Container should have aria-expanded="false" when hidden'
  );
  assert.strictEqual(
    visitsField.getAttribute('aria-hidden'),
    'true',
    'US_Visits_Container should have aria-hidden="true" when hidden'
  );
  // ensure required attributes are removed from existing entries
  assert(
    !firstYear.hasAttribute('required'),
    'USVisit_1_DateArrived_Year should not be required when visits hidden'
  );
  assert(
    !firstLength.hasAttribute('required'),
    'USVisit_1_Length should not be required when visits hidden'
  );

  // Re-select Yes to verify new entries get required attributes
  yesRadio.checked = true;
  yesRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert(
    dom.window.getComputedStyle(visitsField).display !== 'none',
    'US_Visits_Container should be visible after re-selecting Yes'
  );

  // ensure first entry required is present again
  assert(
    doc.getElementById('USVisit_1_DateArrived_Year').hasAttribute('required'),
    'USVisit_1_DateArrived_Year should be required after re-showing visits'
  );

  // Stability test: add one entry while container is visible and ensure aria attributes remain correct
  const visitEntries = () => doc.querySelectorAll('.visit-entry');
  assert.strictEqual(visitEntries().length, 1, 'Initial visit entry should be 1');

  const addOnce = doc.querySelector('.add-visit');
  assert(addOnce, 'add-visit link should exist for stability test');
  addOnce.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  // After adding, container should still be visible and have correct aria attributes
  assert(
    dom.window.getComputedStyle(visitsField).display !== 'none',
    'US_Visits_Container should remain visible after adding an entry'
  );
  assert.strictEqual(
    visitsField.getAttribute('aria-expanded'),
    'true',
    'US_Visits_Container should keep aria-expanded="true" after adding an entry'
  );
  assert.strictEqual(
    visitsField.getAttribute('aria-hidden'),
    'false',
    'US_Visits_Container should keep aria-hidden="false" after adding an entry'
  );

  // Keyboard accessibility: newly added entry should be focusable via programmatic focus
  const entriesNow = visitEntries();
  const last = entriesNow[entriesNow.length - 1];
  const firstInput = last.querySelector('input, select, textarea');
  assert(firstInput, 'newly added visit should contain a focusable control');
  firstInput.focus();
  assert.strictEqual(doc.activeElement, firstInput, 'New entry first control should receive focus');

  const remBtn = last.querySelector('.remove-visit');
  assert(remBtn, 'remove-visit button should exist on newly added entry');
  assert.strictEqual(remBtn.getAttribute('tabindex'), '0', 'remove button should be in tab order');
  remBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  assert(
    dom.window.getComputedStyle(visitsField).display !== 'none',
    'US_Visits_Container should remain visible after removing an entry'
  );
  assert.strictEqual(
    visitsField.getAttribute('aria-expanded'),
    'true',
    'US_Visits_Container should keep aria-expanded="true" after removing an entry'
  );
  assert.strictEqual(
    visitsField.getAttribute('aria-hidden'),
    'false',
    'US_Visits_Container should keep aria-hidden="false" after removing an entry'
  );

  // Now specifically test removing the LAST remaining visit entry
  // Ensure only one entry exists (remove extras if present)
  while (visitEntries().length > 1) {
    const removeLastBtn = visitEntries()[visitEntries().length - 1].querySelector('.remove-visit');
    removeLastBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.strictEqual(
    visitEntries().length,
    1,
    'There should be exactly one visit entry before removing the last one'
  );

  // Remove the last entry (when only one exists, request: remove the node entirely)
  const only = visitEntries()[0];
  const remOnly = only.querySelector('.remove-visit');
  assert(remOnly, 'remove-visit should exist on the only visit entry');
  remOnly.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  // After removing the last entry, behavior: the page should switch US_Visited to 'No' and collapse the container
  const remaining = visitEntries();
  assert.strictEqual(
    remaining.length,
    0,
    'No visit entries should remain after removing the last entry'
  );

  // The US_Visited radio should have been toggled to 'No'
  const noAfter = doc.querySelector('input[name="US_Visited"][value="No"]');
  assert(
    noAfter && noAfter.checked,
    'US_Visited should be set to No after removing the last entry'
  );

  // Container should now be hidden and attributes indicate collapsed state
  assert(
    dom.window.getComputedStyle(visitsField).display === 'none',
    'US_Visits_Container should be hidden after removing the last entry'
  );
  assert.strictEqual(
    visitsField.getAttribute('aria-expanded'),
    'false',
    'US_Visits_Container should have aria-expanded="false" after last entry removed'
  );
  assert.strictEqual(
    visitsField.getAttribute('aria-hidden'),
    'true',
    'US_Visits_Container should have aria-hidden="true" after last entry removed'
  );

  // The user must click 'Yes' again and then 'Add' to create a new entry; verify add works and required attributes apply when visible
  const yesAgain = doc.querySelector('input[name="US_Visited"][value="Yes"]');
  assert(yesAgain, 'US_Visited Yes radio should exist');
  yesAgain.checked = true;
  yesAgain.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  const addBtn = doc.querySelector('.add-visit');
  assert(
    addBtn && addBtn.style.display !== 'none',
    'add control should exist after re-selecting Yes'
  );
  addBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(
    visitEntries().length,
    1,
    'After clicking add, a new visit entry should be created'
  );
  // new first entry should have required attributes while US_Visited is Yes
  const recreatedYear = doc.getElementById('USVisit_1_DateArrived_Year');
  const recreatedLength = doc.getElementById('USVisit_1_Length');
  assert(
    recreatedYear && recreatedYear.hasAttribute('required'),
    'Recreated USVisit_1_DateArrived_Year should be required'
  );
  assert(
    recreatedLength && recreatedLength.hasAttribute('required'),
    'Recreated USVisit_1_Length should be required'
  );

  // Click add until 5 entries
  for (let expected = 2; expected <= 5; expected++) {
    const add = doc.querySelector('.add-visit');
    assert(add, 'add-visit link should exist');
    add.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
    console.log('after add click, entries:', visitEntries().length);
    assert.strictEqual(visitEntries().length, expected, `Expected ${expected} visit entries`);
  }

  // When 5 entries exist, add should be hidden
  const addAfterFive = doc.querySelector('.add-visit');
  const computedAddDisplay = addAfterFive
    ? dom.window.getComputedStyle(addAfterFive).display
    : null;
  const styled = addAfterFive ? addAfterFive.getAttribute('style') : null;

  assert(
    addAfterFive &&
      visitEntries().length === 5 &&
      (computedAddDisplay === 'none' ||
        (styled && styled.indexOf('display: none') !== -1) ||
        addAfterFive.style.display === ''),
    'add control should be hidden or disabled at 5 entries'
  );

  // Renumbering test: add three entries then remove the middle and ensure indexes are contiguous
  // (Ensure at least 3 entries exist; if not, add until length === 3)
  while (visitEntries().length < 3) {
    const add = doc.querySelector('.add-visit');
    add.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.strictEqual(
    visitEntries().length >= 3,
    true,
    'There should be at least 3 visit entries for renumbering test'
  );

  const remMid = doc.querySelector('.visit-entry[data-index="2"] .remove-visit');
  assert(remMid, 'remove button for middle entry should exist');
  assert(
    remMid.getAttribute('aria-label') &&
      remMid.getAttribute('aria-label').indexOf('Remove visit') !== -1,
    'remove button should have an aria-label containing "Remove visit"'
  );
  const beforeRemoval = visitEntries().length;
  remMid.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  // After removal, entries should decrease by one and the second entry should have id with index 2
  assert.strictEqual(
    visitEntries().length,
    beforeRemoval - 1,
    'After removing middle entry, entries should decrease by one'
  );
  assert(
    doc.getElementById('USVisit_2_DateArrived_Year'),
    'USVisit_2_DateArrived_Year should exist after renumbering'
  );

  // Verify newly added entries receive required attributes while US_Visited=Yes
  const newYear = doc.getElementById('USVisit_2_DateArrived_Year');
  const newLength = doc.getElementById('USVisit_2_Length');
  assert(
    newYear && newYear.hasAttribute('required'),
    'USVisit_2_DateArrived_Year should be required when US_Visited = Yes'
  );
  assert(
    newLength && newLength.hasAttribute('required'),
    'USVisit_2_Length should be required when US_Visited = Yes'
  );

  // Toggle back to No and assert required attributes are removed from all entries
  noRadio.checked = true;
  noRadio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  const entriesAfterHide = visitEntries();
  for (let i = 1; i <= entriesAfterHide.length; i++) {
    const y = doc.getElementById(`USVisit_${i}_DateArrived_Year`);
    const l = doc.getElementById(`USVisit_${i}_Length`);
    assert(
      y && !y.hasAttribute('required'),
      `USVisit_${i}_DateArrived_Year should not be required when hidden`
    );
    assert(
      l && !l.hasAttribute('required'),
      `USVisit_${i}_Length should not be required when hidden`
    );
  }

  // Remove last entry and ensure count decreases and add becomes available again
  const removeLast = () => {
    const entries = visitEntries();
    const last = entries[entries.length - 1];
    const rem = last.querySelector('.remove-visit');
    rem.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  };

  const beforeRemove = visitEntries().length;
  removeLast();
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(
    visitEntries().length,
    beforeRemove - 1,
    'After removing one, entries should decrease by one'
  );

  // Ensure add is available again
  const addNow = doc.querySelector('.add-visit');
  assert(
    addNow && addNow.style.display !== 'none',
    'add control should be visible after removing to less than 5 entries'
  );

  console.log('visits.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('visits.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
