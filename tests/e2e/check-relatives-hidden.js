const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async () => {
  try {
    const root = process.cwd();
    const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
    const script = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');

    const combined = html.replace('</body>', `<script>${script}</script></body>`);
    const dom = new JSDOM(combined, { runScripts: 'dangerously', resources: 'usable' });
    // let scripts run
    await new Promise((r) => setTimeout(r, 100));
    const doc = dom.window.document;
    const el = doc.getElementById('relative_details');
    const display = el ? dom.window.getComputedStyle(el).display : 'missing';
    console.log('relative_details display=', display);
    if (display === 'none') process.exit(0);
    else process.exit(2);
  } catch (e) {
    console.error('ERROR:', e && (e.stack || e.message || e));
    process.exit(1);
  }
})();