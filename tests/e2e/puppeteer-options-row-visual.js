/* global updateProgressBar */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, 'trace-output', 'options-row');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
// marker file to verify the script is ever executed in this environment
try {
  fs.writeFileSync(path.join(OUT_DIR, 'started.txt'), 'started');
} catch (e) {
  /* ignore */
}

function save(name, buf) {
  const p = path.join(OUT_DIR, name);
  fs.writeFileSync(p, buf);
  console.log('Saved:', p);
}

(async () => {
  const url = process.env.TARGET_URL || 'http://127.0.0.1:3000/';
  console.log('OPTIONS-ROW: Target URL (or fallback):', url);

  let browser;
  let page;

  // capture helper at the top level of the IIFE (satisfy linter rule)
  async function capture(viewport, suffix, setRTL) {
    await page.setViewport(viewport);
    if (setRTL) {
      await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
      // force reflow
      await page.evaluate(() => void document.body.offsetHeight);
    } else {
      await page.evaluate(() => document.documentElement.setAttribute('dir', 'ltr'));
      await page.evaluate(() => void document.body.offsetHeight);
    }
    // Use page.waitForTimeout when available; otherwise fall back to a JS timeout
    if (typeof page.waitForTimeout === 'function') {
      await page.waitForTimeout(500);
    } else {
      await new Promise((r) => setTimeout(r, 500));
    }
    const screenName = `${setRTL ? 'rtl' : 'ltr'}-${suffix}.png`;
    save(screenName, await page.screenshot({ fullPage: true }));

    const checks = await page.evaluate(() => {
      const el = document.querySelector('.options-row');
      if (!el) return { found: false };
      const cs = getComputedStyle(el);
      // some engines expose gap as computed property
      const gap = cs.gap || cs.columnGap || null;
      return {
        found: true,
        display: cs.display || null,
        flexDirection: cs.flexDirection || null,
        gap: gap || null,
        direction: cs.direction || null,
        docDir: document.documentElement.getAttribute('dir') || null,
      };
    });
    fs.writeFileSync(
      path.join(OUT_DIR, `${setRTL ? 'rtl' : 'ltr'}-${suffix}.json`),
      JSON.stringify(checks, null, 2)
    );
    return checks;
  }

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('OPTIONS-ROW: puppeteer launched');
    page = await browser.newPage();
    // emit page console messages to the node log to aid debugging in CI
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) =>
      console.error('PAGE ERROR:', err && (err.stack || err.message || err))
    );
    page.on('response', (r) => console.log('PAGE RESP:', r.status(), r.url().slice(0, 120)));
    console.log('OPTIONS-ROW: newPage created');

    // Force deterministic local fallback (avoids waiting on an external dev server)
    console.log('OPTIONS-ROW: using local file fallback for deterministic run');
    const htmlPath = require('path').resolve(__dirname, '../../public/index.html');
    const cssPath = require('path').resolve(__dirname, '../../public/style.css');
    const jsPath = require('path').resolve(__dirname, '../../public/js/script.js');
    const html = require('fs').readFileSync(htmlPath, 'utf8');
    console.log('OPTIONS-ROW: setContent() -> starting');
    // avoid waiting on external resource loads; DOMContentLoaded is sufficient for our checks
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    console.log('OPTIONS-ROW: setContent() -> done');

    console.log('OPTIONS-ROW: addStyleTag -> starting');
    await page.addStyleTag({ path: cssPath });
    console.log('OPTIONS-ROW: addStyleTag -> done');

    console.log('OPTIONS-ROW: addScriptTag -> starting');
    await page.addScriptTag({ path: jsPath });
    console.log('OPTIONS-ROW: addScriptTag -> done');

    console.log('OPTIONS-ROW: evaluate DOMContentLoaded -> starting');
    await page.evaluate(() => {
      window.dispatchEvent(new Event('DOMContentLoaded'));
      if (typeof updateProgressBar === 'function') updateProgressBar();
    });
    console.log('OPTIONS-ROW: local content set; ready to capture');

    const results = [];
    // desktop
    results.push({
      viewport: { width: 1200, height: 900 },
      ltr: await capture({ width: 1200, height: 900 }, 'desktop', false),
    });
    // mobile
    results.push({
      viewport: { width: 375, height: 812 },
      ltr: await capture({ width: 375, height: 812 }, 'mobile', false),
    });

    // RTL variants
    results.push({
      viewport: { width: 1200, height: 900 },
      rtl: await capture({ width: 1200, height: 900 }, 'desktop', true),
    });
    results.push({
      viewport: { width: 375, height: 812 },
      rtl: await capture({ width: 375, height: 812 }, 'mobile', true),
    });

    fs.writeFileSync(path.join(OUT_DIR, 'result.json'), JSON.stringify(results, null, 2));

    // basic assertions: ensure the first check found .options-row and display:flex, flex-direction:row
    const first = results[0].ltr;
    if (!first || !first.found) {
      console.error('OPTIONS-ROW: .options-row not found on page');
      process.exit(3);
    }
    if ((first.display || '').toLowerCase() !== 'flex') {
      console.error('OPTIONS-ROW: .options-row is not display:flex', first.display);
      process.exit(4);
    }
    if ((first.flexDirection || '').toLowerCase() !== 'row') {
      console.error('OPTIONS-ROW: .options-row flex-direction is not row', first.flexDirection);
      process.exit(5);
    }
    // gap check - browsers may report gap differently, be permissive
    const gapVal = first.gap;
    if (!gapVal || (typeof gapVal === 'string' && !gapVal.includes('30'))) {
      console.warn(
        'OPTIONS-ROW: gap not reported as containing 30px (value: ' +
          gapVal +
          '). This may be OK depending on UA.'
      );
    }

    // RTL direction check
    const rtlCheck = results[2].rtl;
    if (!rtlCheck || rtlCheck.direction !== rtlCheck.docDir) {
      console.error('OPTIONS-ROW: direction does not match document dir in RTL check', rtlCheck);
      process.exit(6);
    }

    console.log('OPTIONS-ROW: checks passed; artifacts saved to', OUT_DIR);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('OPTIONS-ROW: Interaction failed:', err && (err.stack || err.message || err));
    try {
      if (page) save('error-screenshot.png', await page.screenshot({ fullPage: true }));
    } catch (e) {
      console.error('OPTIONS-ROW: failed to save screenshot', e && e.message);
    }
    if (browser) await browser.close();
    process.exit(2);
  }
})();
