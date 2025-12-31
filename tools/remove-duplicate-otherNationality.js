const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(file, 'utf8');
const regex = /<select\s+id="otherNationalitySelect"[\s\S]*?<\/select>/i;
const matches = s.match(new RegExp(regex, 'gi'));
if (!matches || matches.length < 2) {
  console.log('Found', matches ? matches.length : 0, 'matches. No action taken.');
  process.exit(matches ? 0 : 1);
}
// remove the first match only
s = s.replace(regex, '<!-- removed duplicate otherNationalitySelect -->');
fs.writeFileSync(file, s, 'utf8');
console.log('Removed first duplicate otherNationalitySelect and replaced with comment.');
process.exit(0);
