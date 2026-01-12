const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    dumpio: false,
  });
  const page = await browser.newPage();
  // Polyfill for older Puppeteer versions that do not implement page.waitForTimeout
  if (typeof page.waitForTimeout !== 'function') {
    page.waitForTimeout = (ms) => new Promise((r) => setTimeout(r, ms));
  }
  try {
    const log = (msg) => {
      try {
        fs.appendFileSync(path.resolve(__dirname, 'toggle-logic.log'), msg + '\n');
      } catch (e) {
        /* ignore */
      }
    };
    log('starting test');

    const htmlPath = path.resolve(__dirname, '../../public/index.html');
    const cssPath = path.resolve(__dirname, '../../public/style.css');
    const jsPath = path.resolve(__dirname, '../../public/js/script.js');
    const html = fs.readFileSync(htmlPath, 'utf8');
    try {
      await page.setContent(html);
      log('setContent OK');
    } catch (e) {
      log('setContent ERROR: ' + (e && e.message));
      throw e;
    }
    try {
      await page.addStyleTag({ path: cssPath });
      log('addStyleTag OK');
    } catch (e) {
      log('addStyleTag ERROR: ' + (e && e.message));
      throw e;
    }
    try {
      await page.addScriptTag({ path: jsPath });
      log('addScriptTag OK');
    } catch (e) {
      log('addScriptTag ERROR: ' + (e && e.message));
      throw e;
    }

    // Trigger DOMContentLoaded/init
    try {
      await page.evaluate(() => {
        window.dispatchEvent(new Event('DOMContentLoaded'));
        if (typeof window.initDs160 === 'function') window.initDs160();
      });
      log('dispatched DOMContentLoaded and init');
    } catch (e) {
      log('DOMContentLoaded/init ERROR: ' + (e && e.message));
      throw e;
    }

    // Small wait for any async population
    await page.waitForTimeout(200);

    // 1) Assert hidden by default
    const initial = await page.evaluate(() => {
      const el = document.getElementById('lost_passport_details');
      return el ? window.getComputedStyle(el).display : 'missing';
    });
    log('initial=' + initial);
    console.log('initial display=', initial);
    if (initial !== 'none') {
      console.error('FAILED: lost_passport_details should be hidden by default');
      log('failed initial not hidden');
      await browser.close();
      process.exit(2);
    }

    // 2) Click Yes radio and wait for the container to become visible and the select to be populated
    await page.click('#lostPassportYes');
    // Wait until the container display is not 'none' and options length > 0 (with timeout)
    try {
      await page.waitForFunction(
        () => {
          const el = document.getElementById('lost_passport_details');
          const sel = document.getElementById('lost_passport_country_id');
          const visible = el && window.getComputedStyle(el).display !== 'none';
          const hasOptions = sel && sel.options && sel.options.length > 0;
          return visible && hasOptions;
        },
        { timeout: 3000 }
      );
    } catch (e) {
      // dump debugging info
      const debug = await page.evaluate(() => {
        const el = document.getElementById('lost_passport_details');
        const sel = document.getElementById('lost_passport_country_id');
        return {
          display: el ? window.getComputedStyle(el).display : 'missing',
          options: sel ? (sel.options ? sel.options.length : -1) : -1,
          selectHTML: sel ? sel.innerHTML.slice(0, 500) : null,
        };
      });
      console.error('DEBUG after Yes timeout:', JSON.stringify(debug, null, 2));
      await page
        .screenshot({ path: 'tests/e2e/trace-output/toggle-logic-failure.png', fullPage: true })
        .catch(() => {});
      console.error(
        'FAILED: After clicking Yes, details did not become visible and populated in time'
      );
      await browser.close();
      process.exit(2);
    }

    const afterYes = await page.evaluate(() => {
      const el = document.getElementById('lost_passport_details');
      const sel = document.getElementById('lost_passport_country_id');
      return {
        display: el ? window.getComputedStyle(el).display : 'missing',
        options: sel ? sel.options.length : -1,
      };
    });
    console.log('afterYes=', afterYes);

    // 3) Click No radio and assert hidden again
    await page.click('#lostPassportNo');
    await page.waitForTimeout(200);
    const afterNo = await page.evaluate(() => {
      const el = document.getElementById('lost_passport_details');
      return el ? window.getComputedStyle(el).display : 'missing';
    });
    console.log('afterNo=', afterNo);
    if (afterNo !== 'none') {
      console.error('FAILED: lost_passport_details should be hidden after clicking No');
      await browser.close();
      process.exit(2);
    }

    console.log('toggle-logic test PASSED');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error in toggle-logic test:', err && err.message ? err.message : err);
    try {
      await browser.close();
    } catch (e) {
      /* ignore */
    }
    process.exit(1);
  }
})();
