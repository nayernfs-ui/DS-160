const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async function run() {
  console.log('country-mapping.test.js: starting');
  const root = process.cwd();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');

  // Remove external script tag so JSDOM won't attempt to fetch it
  const cleanedHtml = html.replace(/<script[^>]*src="[^"]*script\.js[^"]*"[^>]*><\/script>/, '');
  const dom = new JSDOM(cleanedHtml);
  const doc = dom.window.document;

  // Gather all select option values that represent countries (ignore empty values)
  const optionValues = Array.from(
    doc.querySelectorAll('select#nationality option, select#otherNationalitySelect option')
  )
    .map((o) => o.value)
    .filter((v) => v && v.trim().length > 0);

  // Extract the countryNamesArabic object from the script
  const match = script.match(/const countryNamesArabic\s*=\s*({[\s\S]*?});/m);
  assert(match, 'countryNamesArabic mapping not found in script.js');

  const mappingSource = match[1];
  // Evaluate the mapping safely within a new Function to avoid polluting globals
  let mapping;
  try {
    // wrap in parens to make it an expression
    mapping = new Function(`return (${mappingSource});`)();
  } catch (e) {
    assert.fail('Failed to parse countryNamesArabic object from script.js: ' + e.message);
  }

  // Find any missing keys
  const missing = optionValues.filter((v) => !Object.prototype.hasOwnProperty.call(mapping, v));
  assert.strictEqual(
    missing.length,
    0,
    'Missing Arabic mappings for countries: ' + missing.join(', ')
  );

  console.log('country-mapping.test.js: PASS');
  process.exit(0);
})().catch((err) => {
  console.error('country-mapping.test.js: FAIL');
  console.error(err);
  process.exit(1);
});
