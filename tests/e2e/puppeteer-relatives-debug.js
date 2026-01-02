const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.TARGET_URL || 'http://localhost:3000';
  console.log('DEBUG: Target URL:', url);
  console.log('DEBUG: Puppeteer product:', puppeteer.product);
  try {
    console.log(
      'DEBUG: Puppeteer executable path:',
      typeof puppeteer.executablePath === 'function' ? puppeteer.executablePath() : 'N/A'
    );
  } catch (e) {
    console.log('DEBUG: Could not determine executablePath:', e && e.message);
  }

  let browser;
  try {
    console.log('DEBUG: Launching Puppeteer (headless:true)');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('DEBUG: Puppeteer launched successfully (headless)');
  } catch (err) {
    console.error('DEBUG: Failed to launch Puppeteer:', err && (err.stack || err.message || err));
    process.exit(2);
  }

  const page = await browser.newPage();
  // Polyfill for older Puppeteer versions that do not implement page.waitForTimeout
  if (typeof page.waitForTimeout !== 'function') {
    page.waitForTimeout = (ms) => new Promise((r) => setTimeout(r, ms));
  }
  console.log('DEBUG: New page created');

  try {
    console.log('DEBUG: Navigating to URL...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('DEBUG: Navigation completed');
  } catch (e) {
    console.error('DEBUG: Navigation failed:', e && (e.stack || e.message || e));
    await browser.close();
    process.exit(2);
  }

  try {
    console.log('DEBUG: Waiting for relatives Yes radio');
    await page.waitForSelector('input[name="US_ImmediateRelatives"][value="Yes"]', {
      timeout: 10000,
    });
    console.log('DEBUG: Found relatives Yes radio; clicking...');
    await page.click('input[name="US_ImmediateRelatives"][value="Yes"]');
    await page.waitForTimeout(300);
    console.log('DEBUG: Clicked relatives Yes');

    console.log('DEBUG: Finding add-relative control');
    const add = await page.$('.add-relative');
    if (!add) {
      console.error('DEBUG: add-relative control not found');
      await browser.close();
      process.exit(3);
    }
    console.log('DEBUG: add-relative control found; clicking twice...');
    await page.evaluate((el) => el.click(), add);
    await page.waitForTimeout(200);
    await page.evaluate((el) => el.click(), add);
    await page.waitForTimeout(200);

    const count = await page.$$eval('.relative-entry', (nodes) => nodes.length);
    console.log('DEBUG: Relative entries count:', count);

    console.log('DEBUG: Filling fields');
    await page.type('#Relative_1_Surnames', 'ALFA');
    await page.type('#Relative_1_GivenNames', 'ONE');
    await page.type('#Relative_2_Surnames', 'BETA');
    await page.type('#Relative_2_GivenNames', 'TWO');

    console.log('DEBUG: Selecting US_OtherRelatives Yes');
    await page.click('input[name="US_OtherRelatives"][value="Yes"]');
    await page.waitForTimeout(100);

    const payload = await page.evaluate(() => {
      const form = document.querySelector('form');
      const fd = new FormData(form);
      const obj = {};
      fd.forEach((v, k) => {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
          obj[k].push(v);
        } else {
          obj[k] = v;
        }
      });
      return obj;
    });

    console.log(
      'DEBUG: payload keys',
      Object.keys(payload).filter((k) => k.indexOf('Relative_') === 0)
    );
    console.log(
      'DEBUG: payload sample',
      payload['Relative_1_Surnames'],
      payload['Relative_2_Surnames']
    );

    if (payload['Relative_1_Surnames'] !== 'ALFA' || payload['Relative_2_Surnames'] !== 'BETA') {
      console.error(
        'DEBUG: Payload did not include expected relative surnames',
        payload['Relative_1_Surnames'],
        payload['Relative_2_Surnames']
      );
      await browser.close();
      process.exit(4);
    }

    if (payload['US_OtherRelatives'] !== 'Yes') {
      console.error(
        'DEBUG: Payload did not include US_OtherRelatives=Yes',
        payload['US_OtherRelatives']
      );
      await browser.close();
      process.exit(5);
    }

    console.log('DEBUG: Relatives smoke test: PASS');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('DEBUG: Interaction failed:', err && (err.stack || err.message || err));
    await browser.close();
    process.exit(6);
  }
})();
