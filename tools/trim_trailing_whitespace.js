const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'index.html');
const orig = fs.readFileSync(file, 'utf8');
const lines = orig.split(/\r?\n/);
const trimmed = lines.map((l) => l.replace(/[ \t]+$/u, ''));
const out = trimmed.join('\n');
if (out === orig.replace(/\r\n/g, '\n')) {
  console.log('No trailing whitespace changes needed.');
  process.exit(0);
}
fs.writeFileSync(file + '.bak', orig, 'utf8');
fs.writeFileSync(file, out, 'utf8');
console.log('Trimmed trailing whitespace in index.html and wrote backup index.html.bak');
// lint-staged test: no-op change
