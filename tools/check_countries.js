const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('../index.html', 'utf8');
const dom = new JSDOM(html);
const opts = [
  ...dom.window.document.querySelectorAll(
    'select#nationality option, select#otherNationalitySelect option'
  ),
]
  .map((o) => o.value)
  .filter((v) => v);
const scriptPath = path.join(__dirname, '..', 'public', 'js', 'script.js');
const script = fs.readFileSync(scriptPath, 'utf8');
const missing = opts.filter((v) => !new RegExp(`\b${v}\b`, 'm').test(script));
if (missing.length) {
  console.log('Missing mappings for:', missing);
  process.exit(1);
} else {
  console.log('All country values have entries in script.js mapping');
}
