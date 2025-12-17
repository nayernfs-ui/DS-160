const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const file = 'file://' + path.resolve('index.html');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  await page.goto(file, { waitUntil: 'load' });
  // wait for the visits block to be potentially hidden initially
  await page
    .waitForSelector('#US_Visits_Container', { visible: true, timeout: 2000 })
    .catch(() => {});

  // click the 'Yes' radio to reveal visits
  await page.click('input[name="US_Visited"][value="Yes"]');
  await page.waitForTimeout(150);

  // repeatedly click the first visible add-visit link until no change
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
    await page.waitForTimeout(120);
    const after = await page.$$eval('.visit-entry', (nodes) => nodes.length);
    results.push(`after-click entries=${after}`);
    if (after === entries) break; // no change
  }

  console.log('PUPPETEER RESULTS:\n' + results.join('\n'));
  await browser.close();
})();
