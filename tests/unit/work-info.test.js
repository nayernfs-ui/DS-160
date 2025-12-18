const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('work-info.test.js: starting');
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

  // surface runtime errors
  dom.window.addEventListener('error', (ev) => {
    console.error('JSDOM window error:', ev.error || ev.message || ev);
  });

  await new Promise((r) => setTimeout(r, 50));
  const doc = dom.window.document;

  // 1) Occupation select and Duties textarea exist and are required
  const occupation = doc.getElementById('jobTitleCurrent');
  assert(occupation, 'jobTitleCurrent select not found');
  assert.strictEqual(occupation.tagName, 'SELECT', 'jobTitleCurrent should be a SELECT element');
  assert(
    occupation.options && occupation.options.length >= 10,
    'jobTitleCurrent should contain options'
  );

  const duties = doc.getElementById('currentDuties');
  assert(duties, 'currentDuties textarea not found');
  assert(duties.hasAttribute('required'), 'currentDuties should have required attribute');

  // Helper removed because it was unused — kept test focused on the stated assertions

  // 2) Invalid year should be rejected by the pattern (checkValidity)
  const year = doc.getElementById('startDateCurrent');
  assert(year, 'startDateCurrent input not found');
  year.value = '20';
  // pattern should cause this to be invalid
  assert.strictEqual(
    year.checkValidity(),
    false,
    'startDateCurrent should be invalid for non-4-digit input'
  );

  // 3) Valid year should pass the pattern
  year.value = '2020';
  assert.strictEqual(
    year.checkValidity(),
    true,
    'startDateCurrent should be valid for a 4-digit year'
  );

  // also ensure the attribute is present on the input
  assert.strictEqual(
    year.getAttribute('pattern'),
    '^[0-9]{4}$',
    'startDateCurrent should have pattern attribute for 4-digit year'
  );

  console.log('work-info.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('work-info.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
