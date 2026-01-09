const https = require('https');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async function run() {
  const url = 'https://ds-160-fresh.vercel.app/';
  console.log('Fetching remote HTML from', url);
  const html = await new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
  const script = fs.readFileSync(path.join(process.cwd(), 'public', 'js', 'script.js'), 'utf8');
  const cleanedHtml = html.replace(/<script[^>]*src="[^"]*script\.js[^"]*"[^>]*><\/script>/, '');
  const combined = cleanedHtml.replace('</body>', `<script>${script}</script></body>`);

  const dom = new JSDOM(combined, { runScripts: 'dangerously', resources: 'usable' });
  await new Promise((r) => setTimeout(r, 50));

  if (typeof dom.window.initDs160 === 'function' && !dom.window.__ds160Ready) {
    dom.window.initDs160();
  }
  await new Promise((r) => setTimeout(r, 20));

  const doc = dom.window.document;
  const yes = doc.querySelector('input[name="HasOtherNationality"][value="Yes"]');
  if (!yes) {
    console.error('HasOtherNationality Yes radio not found');
    process.exit(1);
  }
  yes.checked = true;
  yes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 20));

  const otherNationalityFields = doc.getElementById('otherNationalityFields');
  console.log(
    'otherNationalityFields display=',
    otherNationalityFields && otherNationalityFields.style.display
  );

  const passportYes = doc.querySelector('input[name="Other_Nationality_Passport"][value="Yes"]');
  if (!passportYes) {
    console.error('passport radios not found');
    process.exit(1);
  }
  const row = passportYes.closest('.options-row');
  console.log('passport radios inside options-row?', !!row);

  if (otherNationalityFields && otherNationalityFields.style.display !== 'none' && row) {
    console.log('PASS: sub-question visible and options-row present');
    process.exit(0);
  }
  console.error('FAIL: visibility or options-row missing');
  process.exit(1);
})();
