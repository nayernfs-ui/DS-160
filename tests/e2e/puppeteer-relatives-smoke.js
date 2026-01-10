const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err && (err.stack || err.message || err));
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err && (err.stack || err.message || err));
});

// Artifacts dir (can be overridden from CI via TEST_ARTIFACTS_DIR)
const ARTIFACTS_DIR = process.env.TEST_ARTIFACTS_DIR || path.join(process.cwd(), 'test-artifacts');
const consoleMessages = [];

function ensureArtifactsDir() {
  try {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create artifacts dir:', e && e.message);
  }
}

async function saveArtifacts(page, tag = 'error') {
  try {
    ensureArtifactsDir();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const base = path.join(ARTIFACTS_DIR, `${tag}-${ts}`);

    if (page) {
      try {
        await page.screenshot({ path: `${base}.png`, fullPage: true });
      } catch (e) {
        console.error('Failed to take screenshot:', e && e.message);
      }
      try {
        const html = await page.content();
        fs.writeFileSync(`${base}.html`, html);
      } catch (e) {
        console.error('Failed to save page HTML:', e && e.message);
      }
    }

    try {
      fs.writeFileSync(`${base}.console.json`, JSON.stringify(consoleMessages, null, 2));
    } catch (e) {
      console.error('Failed to write console messages:', e && e.message);
    }
  } catch (e) {
    console.error('saveArtifacts overall failure:', e && e.message);
  }
}

(async () => {
  const url = process.env.TARGET_URL || 'http://localhost:3000';
  console.log('Target URL:', url);
  console.log('puppeteer product:', puppeteer.product);
  try {
    console.log(
      'Puppeteer executable path:',
      typeof puppeteer.executablePath === 'function' ? puppeteer.executablePath() : 'N/A'
    );
  } catch (e) {
    console.log('Could not determine executablePath:', e && e.message);
  }

  let browser;
  try {
    console.log('Launching Puppeteer (headless) with recommended flags and diagnostics');
    const envExec = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    const extra = process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(' ') : [];
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-software-rasterizer',
      ...extra,
    ];
    const launchOpts = { headless: true, args, dumpio: true };
    if (envExec) launchOpts.executablePath = envExec;
    console.log(
      'Launch options:',
      Object.assign({}, launchOpts, { executablePath: !!launchOpts.executablePath })
    );

    // Try a couple of launches with different fallbacks
    let lastErr;
    for (const opts of [
      launchOpts,
      Object.assign({}, launchOpts, { headless: false }),
      Object.assign({}, launchOpts, {
        headless: true,
        args: launchOpts.args.concat(['--disable-extensions']),
      }),
    ]) {
      try {
        browser = await puppeteer.launch(opts);
        console.log('Puppeteer launched successfully (opts):', { headless: !!opts.headless });
        break;
      } catch (e) {
        lastErr = e;
        console.error('Launch attempt failed:', e && (e.stack || e.message || e));
        // small backoff before retry
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if (!browser) {
      console.error('All launch attempts failed. Last error:', lastErr && lastErr.message);
      await saveArtifacts(null, 'launch-failed');
      process.exit(2);
    }

    // Hook up events and tracing
    browser.on('disconnected', async () => {
      console.error('Browser disconnected event fired');
      try {
        await saveArtifacts(null, 'browser-disconnected');
      } catch (e) {
        console.error('Failed to save artifacts after disconnect:', e && e.message);
      }
    });
    try {
      ensureArtifactsDir();
      await browser.newPage(); // ensure at least one page exists for tracing start
      await browser.close();
      // Re-launch quickly to attach tracing to first real page below (best-effort)
      browser = await puppeteer.launch(launchOpts);
    } catch (e) {
      // best-effort; continue
    }
  } catch (err) {
    console.error('Fatal error launching Puppeteer:', err && (err.stack || err.message || err));
    await saveArtifacts(null, 'fatal-launch-error');
    process.exit(2);
  }

  const page = await browser.newPage();
  // collect console messages for artifacting
  page.on('console', (msg) => {
    try {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        args: msg.args().map((a) => String(a)),
      });
    } catch (e) {
      console.debug && console.debug('Console message parse ignored:', e && e.message);
    }
    console.log('PAGE LOG:', msg.text());
  });
  page.on('error', (err) => {
    console.error('Page error:', err && (err.stack || err.message || err));
  });
  // Polyfill for older Puppeteer versions that do not implement page.waitForTimeout
  if (typeof page.waitForTimeout !== 'function') {
    page.waitForTimeout = (ms) => new Promise((r) => setTimeout(r, ms));
  }
  // increase default timeouts to reduce flakiness
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    console.error('Navigation failed:', e && e.message ? e.message : e);
    await saveArtifacts(page, 'navigation-failed');
    try {
      await browser.close();
    } catch (e) {
      console.debug && console.debug('Ignored error closing browser:', e && e.message);
    }
    process.exit(2);
  }

  // --- Verify nationality visibility & divorced exNationality behavior ---
  try {
    const statuses = ['Single', 'Married', 'Divorced'];
    for (const s of statuses) {
      await page.evaluate((val) => {
        const sel = document.getElementById('maritalStatus');
        if (sel) {
          sel.value = val;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, s);

      await page.waitForTimeout(400);

      const natVisible = await page.evaluate(() => {
        const el =
          document.querySelector('#nationality') ||
          document.querySelector('label[for="nationality"]');
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect
          ? el.getBoundingClientRect()
          : { width: 0, height: 0 };
        return !(
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          (rect.width === 0 && rect.height === 0)
        );
      });

      console.log(`[${s}] nationality visible?`, natVisible);
      if (natVisible) {
        console.error('Nationality field is visible when it should be hidden for', s);
        await browser.close();
        process.exit(6);
      }

      if (s === 'Divorced') {
        const exNatOK = await page.evaluate(() => {
          // The public build uses per-former-spouse selects (e.g., formerNationality_1)
          const el =
            document.querySelector('select[id^="formerNationality"]') ||
            document.getElementById('exNationality');
          if (!el) return false;
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect
            ? el.getBoundingClientRect()
            : { width: 0, height: 0 };
          const visible = !(
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            (rect.width === 0 && rect.height === 0)
          );
          const required = el.hasAttribute('required');
          return visible && required;
        });
        if (!exNatOK) {
          // Log detailed diagnostics
          const diag = await page.evaluate(() => {
            const el =
              document.querySelector('select[id^="formerNationality"]') ||
              document.getElementById('exNationality');
            const df = document.getElementById('divorcedFields');
            return {
              selectorFound: !!(
                document.querySelector('select[id^="formerNationality"]') ||
                document.getElementById('exNationality')
              ),
              exExists: !!el,
              exRequired: el ? el.hasAttribute('required') : false,
              exVisibility: el ? window.getComputedStyle(el).display : 'missing',
              exRect: el ? el.getBoundingClientRect() : null,
              divorcedDisplay: df ? window.getComputedStyle(df).display : 'missing',
            };
          });
          console.error('exNationality/formerNationality diagnostics:', diag);
          await saveArtifacts(page, 'exNationality-diag');
          try {
            await browser.close();
          } catch (e) {
            console.debug && console.debug('Ignored error closing browser:', e && e.message);
          }
          process.exit(7);
        }
      }
    }

    console.log('Nationality visibility check: PASS');
  } catch (err) {
    console.error('Nationality check failed:', err && err.message ? err.message : err);
    await saveArtifacts(page, 'nationality-check-failed');
    try {
      await browser.close();
    } catch (e) {
      console.debug && console.debug('Ignored error closing browser:', e && e.message);
    }
    process.exit(6);
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
      await saveArtifacts(page, 'insufficient-relative-entries');
      try {
        await browser.close();
      } catch (e) {
        console.debug && console.debug('Ignored error closing browser:', e && e.message);
      }
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
      await saveArtifacts(page, 'payload-mismatch');
      try {
        await browser.close();
      } catch (e) {
        console.debug && console.debug('Ignored error closing browser:', e && e.message);
      }
      process.exit(4);
    }

    console.log('Relatives smoke test: PASS');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Interaction failed:', err && err.message ? err.message : err);
    await saveArtifacts(page, 'interaction-failed');
    try {
      await browser.close();
    } catch (e) {
      console.debug && console.debug('Ignored error closing browser:', e && e.message);
    }
    process.exit(5);
  }
})();
