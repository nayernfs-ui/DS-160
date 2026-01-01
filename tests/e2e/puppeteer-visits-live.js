// Copied and trimmed from tools/puppeteer-visits-live.js for stable e2e baseline
const puppeteer = require('puppeteer');

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err && (err.stack || err.message || err));
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err && (err.stack || err.message || err));
});

(async () => {
  const url = process.env.TARGET_URL || 'https://ds-160-fresh.vercel.app/';
  console.log('Target URL:', url);
  console.log('Visiting:', url);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], dumpio: true });
  console.log('Browser launched. Creating new page...');
  const page = await browser.newPage();
  console.log('New page created.');

  // Use a realistic user agent and headers to reduce possible headless blocking
  try {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(ua);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    console.log('User agent and headers set to mimic a regular browser');
  } catch (err) {
    console.error('Failed to set user agent/headers:', err && err.message ? err.message : err);
  }

  browser.on('disconnected', () => console.error('Browser disconnected event fired'));
  page.on('error', (err) => console.error('Page error:', err && (err.stack || err.message || err)));
  page.on('pageerror', (err) =>
    console.error('Page runtime error:', err && (err.stack || err.message || err))
  );
  page.on('requestfailed', (req) => {
    try {
      const f = req.failure && req.failure();
      console.error('Request failed:', {
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        errorText: f && f.errorText,
        status: req.response && req.response().status(),
      });
    } catch (err) {
      console.error('Error logging requestfailed:', err && err.message ? err.message : err);
    }
  });
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  try {
    console.log('Navigating to URL (soft load)...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Navigation completed (domcontentloaded).');
  } catch (e) {
    console.error('Navigation failed:', e && e.message ? e.message : e);
    await browser.close();
    process.exit(2);
  }

  try {
    // Wait for US_Visited Yes radio
    console.log('Waiting for visits radio...');
    await page.waitForSelector('input[name="US_Visited"][value="Yes"]', { timeout: 10000 });
    console.log('Clicking Yes radio to reveal visits...');
    await page.click('input[name="US_Visited"][value="Yes"]');
    await new Promise((r) => setTimeout(r, 400));
    console.log('After clicking Yes radio and waiting.');

    // --- New e2e check: marital visibility when selecting Married ---
    try {
      console.log('Waiting for marital status select...');
      await page.waitForSelector('#maritalStatus', { timeout: 10000 });
      console.log('Selecting Married from marital status...');
      await page.select('#maritalStatus', 'Married');
      // allow time for DOM updates
      await new Promise((r) => setTimeout(r, 200));

      const widowDisplay = await page.$eval(
        '#widowInfo',
        (el) => window.getComputedStyle(el).display
      );
      const spouseDisplay = await page.$eval(
        '#spouseInfo',
        (el) => window.getComputedStyle(el).display
      );

      if (widowDisplay !== 'none') {
        console.error(
          'E2E: widowInfo should be hidden when Married is selected; got',
          widowDisplay
        );
        await browser.close();
        process.exit(4);
      }

      if (spouseDisplay === 'none') {
        console.error(
          'E2E: spouseInfo should be visible when Married is selected; got',
          spouseDisplay
        );
        await browser.close();
        process.exit(5);
      }

      console.log('E2E: marital visibility check passed (Married shows spouse, hides widowed)');
    } catch (err) {
      console.error('E2E marital visibility check failed:', err && err.message ? err.message : err);
      await browser.close();
      process.exit(3);
    }
  } catch (e) {
    console.error('Interaction failed:', e && e.message ? e.message : e);
    await browser.close();
    process.exit(3);
  }

  // Click add up to 6 times, record entries count
  console.log('Starting add-entry loop...');
  const results = [];
  for (let i = 0; i < 6; i++) {
    console.log('Loop iteration', i);
    const entries = await page.$$eval('.visit-entry', (nodes) => nodes.length);
    console.log('Entries currently:', entries);
    results.push(`before-click entries=${entries}`);
    const add = await page.$('.add-visit');
    if (!add) {
      console.log('Add control not found; breaking loop');
      results.push('add control not found');
      break;
    }
    // Ensure add is visible/interactive before clicking
    const addVisible = await page.evaluate((el) => {
      try {
        const s = window.getComputedStyle(el);
        return s && s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null;
      } catch (e) {
        return false;
      }
    }, add);
    if (!addVisible) {
      console.log('Add control exists but is not visible; breaking loop');
      results.push('add control hidden');
      break;
    }
    try {
      await page.evaluate((el) => el.click(), add);
    } catch (err) {
      console.error(
        'Click failed on add control (evaluate click):',
        err && err.message ? err.message : err
      );
      results.push('add click failed');
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
    const after = await page.$$eval('.visit-entry', (nodes) => nodes.length);
    console.log('Entries after click:', after);
    results.push(`after-click entries=${after}`);
    if (after === entries) {
      console.log('No change after click; stopping loop');
      break;
    }
  }

  console.log('LIVE PUPPETEER RESULTS:\n' + results.join('\n'));

  // Consider test successful if any iteration recorded 'after-click entries=5'
  const reachedFive = results.some((r) => (r || '').indexOf('after-click entries=5') !== -1);

  if (!reachedFive) {
    console.error('Live site test did not reach 5 entries');
    console.error('Results:', results);
    await browser.close();
    process.exit(1);
  }

  console.log(
    'Reached 5 entries — now verifying keyboard navigation (Tab) reaches newly generated fields...'
  );

  // Try to tab until focus lands inside the last (5th) visit entry
  await page.focus('body');
  let foundTab = false;
  for (let i = 0; i < 150; i++) {
    await page.keyboard.press('Tab');
    await new Promise((r) => setTimeout(r, 10));
    const inside = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const parent = el.closest && el.closest('.visit-entry');
      return parent && parent.getAttribute && parent.getAttribute('data-index') === '5';
    });
    if (inside) {
      foundTab = true;
      break;
    }
  }

  if (foundTab) {
    console.log('Keyboard navigation reaches newly generated fields: PASS');
    console.log('Live site supports up to 5 entries: PASS');
    await browser.close();
    process.exit(0);
  }

  console.error('Keyboard navigation did not reach the newly generated fields (Tab check failed)');
  await browser.close();
  process.exit(1);
})();
