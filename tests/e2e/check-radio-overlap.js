/* global updateProgressBar */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const OUT = path.resolve(__dirname, 'trace-output', 'options-row', 'radio-overlap.json');
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    // load local html+css+js like the other test
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

    const results = await page.evaluate(() => {
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      const checks = radios.map((r) => {
        const rect = r.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const topEl = document.elementFromPoint(cx, cy);
        const overlapped = topEl ? topEl !== r && !r.contains(topEl) && !topEl.contains(r) : false;
        return {
          name: r.name || null,
          id: r.id || null,
          value: r.value || null,
          checked: r.checked || false,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          elementAtCenter: topEl
            ? topEl.outerHTML
              ? topEl.outerHTML.slice(0, 200)
              : String(topEl)
            : null,
          overlapped,
        };
      });
      return checks;
    });

    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
    console.log('Saved results to', OUT);
    await browser.close();
  } catch (err) {
    console.error(err && (err.stack || err.message || err));
    process.exit(2);
  }
})();
