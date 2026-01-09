/* global updateProgressBar */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const OUT = path.resolve(__dirname, 'trace-output', 'options-row', 'radio-overlap-focus.json');
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    const htmlPath = path.resolve(__dirname, '../../public/index.html');
    const cssPath = path.resolve(__dirname, '../../public/style.css');
    const jsPath = path.resolve(__dirname, '../../public/js/script.js');
    const html = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ path: cssPath });
    await page.addScriptTag({ path: jsPath });
    await page.evaluate(() => {
      window.dispatchEvent(new Event('DOMContentLoaded'));
      if (typeof updateProgressBar === 'function') updateProgressBar();
    });

    // find all question-groups that contain an .options-row and test focus behavior
    const results = await page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('.question-group')).map((g, idx) => ({
        el: g,
        idx,
      }));
      const out = [];
      groups.forEach((gObj) => {
        const g = gObj.el;
        const opt = g.querySelector('.options-row');
        if (!opt) return; // only care groups with options
        // find a focusable child that is not a radio/checkbox (like input[type=text] or select/textarea)
        const focusable = g.querySelector(
          "input:not([type='radio']):not([type='checkbox']), select, textarea, button"
        );
        // capture radio overlap before focus
        const radios = Array.from(opt.querySelectorAll("input[type='radio']"));
        const checkOverlap = (contextNote) => {
          return radios.map((r) => {
            const rect = r.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const topEl = document.elementFromPoint(cx, cy);
            const overlapped = topEl
              ? topEl !== r && !r.contains(topEl) && !topEl.contains(r)
              : false;
            return {
              name: r.name,
              id: r.id || null,
              value: r.value,
              context: contextNote,
              overlapped,
              elementAtCenter: topEl && topEl.outerHTML ? topEl.outerHTML.slice(0, 200) : null,
            };
          });
        };
        const before = checkOverlap('before');
        if (focusable) {
          focusable.focus();
        }
        const after = checkOverlap('after');
        out.push({ idx: gObj.idx, hasFocusable: !!focusable, before, after });
      });
      return out;
    });

    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
    console.log('Saved results to', OUT);
    await browser.close();
  } catch (err) {
    console.error(err && (err.stack || err.message || err));
    process.exit(2);
  }
})();
