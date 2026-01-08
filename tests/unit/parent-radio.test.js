const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  const root = process.cwd();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');
  const cleanedHtml = html.replace(/<script[^>]*src="[^"]*script\.js[^"]*"[^>]*><\/script>/, '');
  const combined = cleanedHtml.replace('</body>', `<script>${script}</script></body>`);
  const dom = new JSDOM(combined, { runScripts: 'dangerously', resources: 'usable' });

  // Wait briefly for scripts to initialize
  await new Promise((r) => setTimeout(r, 50));
  const doc = dom.window.document;

  const fatherYes = doc.querySelector('input[name="Father_In_US"][value="Yes"]');
  const fatherNo = doc.querySelector('input[name="Father_In_US"][value="No"]');
  assert(fatherYes && fatherNo, 'Father radios should exist');

  const fatherStatusGroup = doc.getElementById('fatherStatusGroup');
  const fatherStatus = doc.getElementById('fatherStatus');
  assert(fatherStatusGroup && fatherStatus, 'Father status elements should exist');

  // Initially hidden
  assert.strictEqual(dom.window.getComputedStyle(fatherStatusGroup).display, 'none');
  assert.strictEqual(fatherStatusGroup.getAttribute('aria-expanded'), 'false');
  assert(!fatherStatus.hasAttribute('required'));

  // Show when selecting Yes
  fatherYes.checked = true;
  fatherYes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.notStrictEqual(dom.window.getComputedStyle(fatherStatusGroup).display, 'none');
  assert.strictEqual(fatherStatusGroup.getAttribute('aria-expanded'), 'true');
  assert(fatherStatus.hasAttribute('required'));

  // Hide when selecting No
  fatherNo.checked = true;
  fatherNo.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(dom.window.getComputedStyle(fatherStatusGroup).display, 'none');
  assert.strictEqual(fatherStatusGroup.getAttribute('aria-expanded'), 'false');
  assert(!fatherStatus.hasAttribute('required'));

  console.log('parent-radio.test.js: passed');
})();
