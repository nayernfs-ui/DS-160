const puppeteer = require('puppeteer');
console.log('inspect-relatives-label.js: start');

(async () => {
  const url = process.env.TARGET_URL || 'https://ds-160-fresh.vercel.app';
  console.log('Inspect relatives labels:', url);
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--hide-scrollbars']
    });
    const page = await browser.newPage();
    page.on('console', (m) => console.log('PAGE:', m.text()));
    page.on('pageerror', (err) => console.error('PAGE ERROR:', err && (err.stack || err.message || err)));

    console.log(' -> setting local content (deterministic)');
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.resolve(__dirname, '../../public/index.html');
    const cssPath = path.resolve(__dirname, '../../public/style.css');
    const jsPath = path.resolve(__dirname, '../../public/js/script.js');
    const html = fs.readFileSync(htmlPath, 'utf8');

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    console.log(' -> setContent complete');
    await page.addStyleTag({ path: cssPath });
    console.log(' -> addStyleTag complete');
    await page.addScriptTag({ path: jsPath });
    console.log(' -> addScriptTag complete');

    try {
      await page.waitForSelector('#relativesYes', { timeout: 10000 });
      console.log(' -> relativesYes selector found');
    } catch (e) {
      console.warn(' -> relativesYes selector NOT found within timeout');
    }

    // Wait for fonts to load to ensure final layout (prevents false positives due to FOIT/FOUT)
    try {
      await page.evaluateHandle(() => document.fonts.ready);
      console.log(' -> document.fonts.ready resolved');
    } catch (e) {
      console.warn(' -> document.fonts.ready not available or failed');
    }

    await new Promise((r) => setTimeout(r, 500));

    const viewports = [ { width: 1200, height: 900 }, { width: 800, height: 600 }, { width: 375, height: 812 } ];
    const results = [];
    for (const vp of viewports) {
      await page.setViewport(vp);
      await new Promise((r) => setTimeout(r, 250));
      const info = await page.evaluate(() => {
        function infoForInput(id) {
          const input = document.getElementById(id);
          if (!input) return { id, found: false };
          const lab = input.closest('label');
          const el = lab || input;
          const inputRect = input.getBoundingClientRect();
          const labRect = el.getBoundingClientRect();
          let textNodeRect = null;
          try {
            const range = document.createRange();
            if (input && input.nextSibling) range.setStartAfter(input);
            else if (el) range.setStart(el, 0);
            range.setEnd(el, el.childNodes.length);
            const r = range.getBoundingClientRect ? range.getBoundingClientRect() : (range.getClientRects()[0] || null);
            if (r && r.width) textNodeRect = r;
          } catch (e) {}

          let overlap = false;
          if (inputRect && textNodeRect) {
            const ol = Math.max(inputRect.left, textNodeRect.left);
            const or = Math.min(inputRect.right, textNodeRect.right);
            overlap = or - ol > 2; // small fudge
          }

          return {
            id,
            found: true,
            labelText: lab ? lab.innerText.trim() : null,
            labelWhiteSpace: lab ? getComputedStyle(lab).whiteSpace : null,
            labelDisplay: lab ? getComputedStyle(lab).display : null,
            inputRect: { left: Math.round(inputRect.left), right: Math.round(inputRect.right), width: Math.round(inputRect.width) },
            textRect: textNodeRect ? { left: Math.round(textNodeRect.left), right: Math.round(textNodeRect.right), width: Math.round(textNodeRect.width) } : null,
            overlap
          };
        }

        return {
          yes: infoForInput('relativesYes'),
          no: infoForInput('relativesNo'),
          otherYes: infoForInput('otherRelativesYes'),
          otherNo: infoForInput('otherRelativesNo'),
          lostPassportDoNotKnow: infoForInput('lostPassportDoNotKnow'),
          docDir: document.documentElement.getAttribute('dir'),
          viewport: { width: window.innerWidth, height: window.innerHeight }
        };
      });
      results.push({ viewport: vp, info });
    }

    console.log(JSON.stringify(results, null, 2));
    await browser.close();
  } catch (err) {
    console.error('INSPECT RELATIVES: failed', err && (err.stack || err.message || err));
    process.exit(2);
  }
})();