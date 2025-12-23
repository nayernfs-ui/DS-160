const puppeteer = require('puppeteer');

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err && (err.stack || err.message || err));
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err && (err.stack || err.message || err));
});

(async () => {
  const url = process.env.TARGET_URL || 'http://localhost:3000';
  console.log('Target URL:', url);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    console.error('Navigation failed:', e && e.message ? e.message : e);
    await browser.close();
    process.exit(2);
  }

  try {
    // Wait for the relatives question
    await page.waitForSelector('input[name="US_ImmediateRelatives"][value="Yes"]', {
      timeout: 10000,
    });
    await page.click('input[name="US_ImmediateRelatives"][value="Yes"]');
    await page.waitForTimeout(300);

    // Add two more entries (total 3)
    for (let i = 0; i < 2; i++) {
      const add = await page.$('.add-relative');
      if (!add) throw new Error('add-relative control not found');
      await page.evaluate((el) => el.click(), add);
      await page.waitForTimeout(200);
    }

    const count = await page.$$eval('.relative-entry', (nodes) => nodes.length);
    console.log('Relative entries count:', count);
    if (count < 3) {
      console.error('Failed to create 3 relative entries');
      await browser.close();
      process.exit(3);
    }

    // Fill in some values for first three
    await page.type('#Relative_1_Surnames', 'ALFA');
    await page.type('#Relative_1_GivenNames', 'ONE');
    await page.type('#Relative_2_Surnames', 'BETA');
    await page.type('#Relative_2_GivenNames', 'TWO');
    await page.type('#Relative_3_Surnames', 'GAMMA');
    await page.type('#Relative_3_GivenNames', 'THREE');

    // Select the "other relatives" question = Yes
    const otherYes = await page.$('input[name="US_OtherRelatives"][value="Yes"]');
    if (!otherYes) throw new Error('US_OtherRelatives Yes radio not found');
    await page.evaluate((el) => el.click(), otherYes);
    await page.waitForTimeout(100);

    // Gather form JSON in page context
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
      'Form payload keys:',
      Object.keys(payload).filter((k) => k.indexOf('Relative_') === 0)
    );

    // Verify keys present and values match
    if (payload['Relative_1_Surnames'] !== 'ALFA' || payload['Relative_2_Surnames'] !== 'BETA') {
      console.error(
        'Payload does not include expected relative surnames',
        payload['Relative_1_Surnames'],
        payload['Relative_2_Surnames']
      );
      await browser.close();
      process.exit(4);
    }

    // Verify other relatives is captured
    if (payload['US_OtherRelatives'] !== 'Yes') {
      console.error('Payload did not include US_OtherRelatives=Yes', payload['US_OtherRelatives']);
      await browser.close();
      process.exit(5);
    }

    console.log('Relatives smoke test: PASS');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Interaction failed:', err && err.message ? err.message : err);
    await browser.close();
    process.exit(5);
  }
})();
