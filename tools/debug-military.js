const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
(async () => {
  try {
    const root = process.cwd();
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const script = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');
    const cleanedHtml = html.replace(
      /<script[^>]*src=['"][^'"]*script\.js[^'"]*['"][^>]*><\/script>/,
      ''
    );
    const combined = cleanedHtml.replace('</body>', `<script>${script}</script></body>`);
    const dom = new JSDOM(combined, { runScripts: 'dangerously', resources: 'usable' });
    await new Promise((r) => setTimeout(r, 80));
    const doc = dom.window.document;
    const mf = doc.getElementById('militaryFields');
    console.log('condInit=', dom.window.__ds160ConditionalInit);
    console.log('military inline style=', mf && mf.getAttribute('style'));
    console.log('military aria-expanded=', mf && mf.getAttribute('aria-expanded'));
    console.log('computed display=', mf && dom.window.getComputedStyle(mf).display);
    // Try toggling Yes to see if handlers react in JSDOM
    const yes = doc.querySelector('input[name="Military_Served"][value="Yes"]');
    console.log('checkedPatched=', !!dom.window.HTMLInputElement.prototype.__ds160CheckedPatched);
    console.log('yes exists', !!yes);
    if (yes) {
      // set via property to exercise the patched setter, and dispatch a change event to exercise change handlers
      yes.checked = true;
      yes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      console.log('after toggle aria-expanded=', mf && mf.getAttribute('aria-expanded'));
      console.log('after toggle computed display=', mf && dom.window.getComputedStyle(mf).display);
      console.log('after toggle inline style:', mf && mf.style.cssText);
    }
  } catch (err) {
    console.error('debug failed', err && (err.stack || err.message || err));
    process.exit(1);
  }
})();
