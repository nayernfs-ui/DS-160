const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://ds-160-jet.vercel.app/';
  console.log('Visiting:', url);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  try {
    console.log('Navigating to URL...');
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    console.log('Navigation succeeded.');
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
    await page.waitForTimeout(400);
  } catch (e) {
    console.error('Interaction failed:', e && e.message ? e.message : e);
    await browser.close();
    process.exit(3);
  }

  // Click add up to 6 times, record entries count
  const results = [];
  for (let i = 0; i < 6; i++) {
    const entries = await page.$$eval('.visit-entry', (nodes) => nodes.length);
    results.push(`before-click entries=${entries}`);
    const add = await page.$('.add-visit');
    if (!add) {
      results.push('add control not found');
      break;
    }
    await add.click();
    await page.waitForTimeout(200);
    const after = await page.$$eval('.visit-entry', (nodes) => nodes.length);
    results.push(`after-click entries=${after}`);
    if (after === entries) break;
  }

  console.log('LIVE PUPPETEER RESULTS:\n' + results.join('\n'));

  // Check that we reached 5 entries
  const final = results[results.length - 1] || '';
  const reachedFive = final.indexOf('after-click entries=5') !== -1;

  if (!reachedFive) {
    console.error('Live site test did not reach 5 entries');
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
    await page.waitForTimeout(10);
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
