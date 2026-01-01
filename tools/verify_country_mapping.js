const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('../index.html', 'utf8');
const dom = new JSDOM(html);
const opts = [...dom.window.document.querySelectorAll('select option')]
  .map((o) => o.value)
  .filter(Boolean);
const scriptPath = path.join(__dirname, '..', 'public', 'js', 'script.js');
const script = fs.readFileSync(scriptPath, 'utf8');
const m = script.match(/const countryNamesArabic\s*=\s*({[\s\S]*?});/m);
if (!m) {
  console.error('country mapping not found');
  process.exit(1);
}
const objSrc = m[1];
const obj = eval('(' + objSrc + ')');
const missing = opts.filter((v) => v && !Object.prototype.hasOwnProperty.call(obj, v));
if (missing.length) {
  console.log('Missing mappings:', missing);
  process.exit(1);
} else {
  console.log('All option values are present in countryNamesArabic (count', opts.length + ')');
}
