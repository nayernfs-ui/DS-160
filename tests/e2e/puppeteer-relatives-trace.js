const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, 'trace-output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function save(name, buf) {
  const p = path.join(OUT_DIR, name);
  fs.writeFileSync(p, buf);
  console.log('Saved:', p);
}

(async () => {
  const url = process.env.TARGET_URL || 'https://ds-160-fresh.vercel.app/';
  console.log('TRACE: Target URL:', url);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Polyfill for older Puppeteer versions
    if (typeof page.waitForTimeout !== 'function')
      page.waitForTimeout = (ms) => new Promise((r) => setTimeout(r, ms));

    page.on('console', (msg) => {
      try {
        console.log('PAGE LOG:', msg.type(), msg.text());
      } catch (e) {
        console.log('PAGE LOG: (could not get message)', e && e.message);
      }
    });

    page.on('pageerror', (err) =>
      console.error('PAGE ERROR:', err && (err.stack || err.message || err))
    );

    page.on('response', (res) => {
      try {
        if (res.status && res.status() >= 400)
          console.log('PAGE RESPONSE ERROR:', res.status(), res.url());
      } catch (e) {
        console.error('PAGE RESPONSE handler error', e && e.message);
      }
    });

    page.on('requestfailed', (req) => {
      try {
        const f = req.failure && req.failure();
        console.log('REQUEST FAILED:', f && f.errorText, req.url());
      } catch (e) {
        console.error('REQUEST FAILED handler error', e && e.message);
      }
    });

    try {
      console.log('TRACE: navigating...');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('TRACE: navigation domcontentloaded');
      save('1-after-nav.png', await page.screenshot({ fullPage: true }));

      console.log('TRACE: waiting for relatives Yes radio');
      await page.waitForSelector('input[name="US_ImmediateRelatives"][value="Yes"]', {
        timeout: 10000,
      });
      console.log('TRACE: clicking Yes');
      await page.click('input[name="US_ImmediateRelatives"][value="Yes"]');
      await page.waitForTimeout(500);
      save('2-after-click-yes.png', await page.screenshot({ fullPage: true }));

      console.log('TRACE: locating add-relative control');
      const add = await page.$('.add-relative');
      if (!add) {
        console.error('TRACE: add-relative control not found');
        save('error-html-after-no-add.html', Buffer.from(await page.content(), 'utf8'));
        fs.writeFileSync(path.join(OUT_DIR, 'result.txt'), 'FAIL: no-add-control');
        await browser.close();
        process.exit(3);
      }

      console.log('TRACE: clicking add-relative twice');
      await page.evaluate((el) => el.click(), add);
      await page.waitForTimeout(300);
      save('3-after-add-1.png', await page.screenshot({ fullPage: true }));
      await page.evaluate((el) => el.click(), add);
      await page.waitForTimeout(300);
      save('4-after-add-2.png', await page.screenshot({ fullPage: true }));

      const count = await page.$$eval('.relative-entry', (nodes) => nodes.length);
      console.log('TRACE: relative entries count:', count);
      save('5-after-add-count.png', await page.screenshot({ fullPage: true }));

      console.log('TRACE: filling fields');
      await page.type('#Relative_1_Surnames', 'ALFA');
      await page.type('#Relative_1_GivenNames', 'ONE');
      await page.type('#Relative_2_Surnames', 'BETA');
      await page.type('#Relative_2_GivenNames', 'TWO');
      save('6-after-fill.png', await page.screenshot({ fullPage: true }));

      console.log('TRACE: selecting US_OtherRelatives Yes');
      const otherYes = await page.$('input[name="US_OtherRelatives"][value="Yes"]');
      if (!otherYes) {
        console.error('TRACE: US_OtherRelatives Yes radio not found');
        save('error-html-after-no-other.html', Buffer.from(await page.content(), 'utf8'));
        fs.writeFileSync(path.join(OUT_DIR, 'result.txt'), 'FAIL: no-other-radio');
        await browser.close();
        process.exit(4);
      }
      await page.evaluate((el) => el.click(), otherYes);
      await page.waitForTimeout(300);
      save('7-after-other-yes.png', await page.screenshot({ fullPage: true }));

      // collect final payload
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

      fs.writeFileSync(path.join(OUT_DIR, 'payload.json'), JSON.stringify(payload, null, 2));
      console.log('TRACE: saved payload.json');
      console.log(
        'TRACE: Form payload keys:',
        Object.keys(payload).filter((k) => k.indexOf('Relative_') === 0)
      );
      save('8-final-html.html', Buffer.from(await page.content(), 'utf8'));

      // sanity checks
      if (payload['Relative_1_Surnames'] !== 'ALFA' || payload['Relative_2_Surnames'] !== 'BETA') {
        console.error(
          'TRACE: Payload missing expected values',
          payload['Relative_1_Surnames'],
          payload['Relative_2_Surnames']
        );
        save('error-html-final.html', Buffer.from(await page.content(), 'utf8'));
        fs.writeFileSync(path.join(OUT_DIR, 'result.txt'), 'FAIL: payload-values');
        await browser.close();
        process.exit(5);
      }

      if (payload['US_OtherRelatives'] !== 'Yes') {
        console.error('TRACE: US_OtherRelatives was not captured', payload['US_OtherRelatives']);
        save('error-html-final-other.html', Buffer.from(await page.content(), 'utf8'));
        fs.writeFileSync(path.join(OUT_DIR, 'result.txt'), 'FAIL: payload-other');
        await browser.close();
        process.exit(6);
      }

      console.log('TRACE: Relatives smoke test: PASS');
      fs.writeFileSync(path.join(OUT_DIR, 'result.txt'), 'PASS');
      await browser.close();
      process.exit(0);
    } catch (err) {
      console.error('TRACE: Interaction failed:', err && (err.stack || err.message || err));
      try {
        save('error-screenshot.png', await page.screenshot({ fullPage: true }));
        save('error-html.html', Buffer.from(await page.content(), 'utf8'));
        fs.writeFileSync(path.join(OUT_DIR, 'result.txt'), 'FAIL: interaction-exception');
      } catch (e) {
        console.error('TRACE: failed to save artifacts', e && e.message);
      }
      await browser.close();
      process.exit(7);
    }
  } catch (e) {
    console.error(
      'TRACE: Could not launch browser or setup page:',
      e && (e.stack || e.message || e)
    );
    if (browser) await browser.close();
    process.exit(2);
  }
})();
