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
        fs.appendFileSync(path.resolve(__dirname, 'live-toggle.log'), msg + '\n');
      } catch (e) {
        /* ignore */
      }
    };
    log('starting live-toggle test');

    // Visit the live preview URL (deployed site)
    const target = 'https://ds-160-fresh.vercel.app/';
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 });
      log('page.goto OK');
    } catch (e) {
      log('page.goto ERROR: ' + (e && e.message));
      throw e;
    }

    // Small wait for any async population
    await page.waitForTimeout(500);

    // Wait for the relevant radios to exist
    await page.waitForSelector('#lostPassportYes', { timeout: 5000 });
    await page.waitForSelector('#lostPassportNo', { timeout: 5000 });

    // 1) Assert hidden by default
    const initial = await page.evaluate(() => {
      const el = document.getElementById('lost_passport_details');
      return el ? window.getComputedStyle(el).display : 'missing';
    });
    log('initial=' + initial);
    console.log('initial display=', initial);
    if (initial !== 'none') {
      console.error('FAILED: lost_passport_details should be hidden by default (live)');
      log('failed initial not hidden (live)');
      await browser.close();
      process.exit(2);
    }

    // 2) Click Yes radio and wait for the container to become visible and the select to be populated
    await page.click('#lostPassportYes');
    try {
      await page.waitForFunction(
        () => {
          const el = document.getElementById('lost_passport_details');
          const sel = document.getElementById('lost_passport_country_id');
          const visible = el && window.getComputedStyle(el).display !== 'none';
          const hasOptions = sel && sel.options && sel.options.length > 0;
          return visible && hasOptions;
        },
        { timeout: 8000 }
      );
    } catch (e) {
      const debug = await page.evaluate(() => {
        const el = document.getElementById('lost_passport_details');
        const sel = document.getElementById('lost_passport_country_id');
        return {
          display: el ? window.getComputedStyle(el).display : 'missing',
          options: sel ? (sel.options ? sel.options.length : -1) : -1,
          selectHTML: sel ? sel.innerHTML.slice(0, 500) : null,
        };
      });
      console.error('DEBUG (live) after Yes timeout:', JSON.stringify(debug, null, 2));
      await page
        .screenshot({ path: 'tests/e2e/trace-output/live-toggle-failure.png', fullPage: true })
        .catch(() => {});
      console.error(
        'FAILED: After clicking Yes (live), details did not become visible and populated in time'
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
    console.log('afterYes (live)=', afterYes);

    // 3) Click No radio and assert hidden again
    await page.click('#lostPassportNo');
    await page.waitForTimeout(200);
    const afterNo = await page.evaluate(() => {
      const el = document.getElementById('lost_passport_details');
      return el ? window.getComputedStyle(el).display : 'missing';
    });
    console.log('afterNo (live)=', afterNo);
    if (afterNo !== 'none') {
      console.error('FAILED: lost_passport_details should be hidden after clicking No (live)');
      await browser.close();
      process.exit(2);
    }

    console.log('live-toggle test PASSED');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error in live-toggle test:', err && err.message ? err.message : err);
    try {
      await browser.close();
    } catch (e) {
      /* ignore */
    }
    process.exit(1);
  }
})();
