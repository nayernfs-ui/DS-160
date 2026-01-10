const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  console.log('PUPPETEER START');
  const file = 'file://' + path.resolve('index.html');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  console.log('PUPPETEER LAUNCHED');

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  await page.goto(file, { waitUntil: 'load' });
  // wait for the visits block to be potentially hidden initially
  await page
    .waitForSelector('#US_Visits_Container', { visible: true, timeout: 2000 })
    .catch(() => {});

  // select 'Yes' radio to reveal visits (dispatch change event)
  await page.evaluate(() => {
    const el = document.querySelector('input[name="US_Visited"][value="Yes"]');
    if (el) {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('PAGE: selected Yes');
    }
  });
  await new Promise((r) => setTimeout(r, 150));

  // repeatedly click the first visible add-visit link until no change
  const results = [];
  for (let i = 0; i < 6; i++) {
    const entries = await page.$$eval('.visit-entry', (nodes) => nodes.length);
    results.push(`before-click entries=${entries}`);
    const clicked = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('.add-visit')).find(
        (e) => window.getComputedStyle(e).display !== 'none'
      );
      if (!el) return false;
      el.click();
      return true;
    });
    if (!clicked) {
      results.push('add control not found or not visible');
      break;
    }
    await new Promise((r) => setTimeout(r, 120));
    const after = await page.$$eval('.visit-entry', (nodes) => nodes.length);
    results.push(`after-click entries=${after}`);
    if (after === entries) break; // no change
  }

  console.log('PUPPETEER RESULTS:\n' + results.join('\n'));
  await browser.close();
})();
