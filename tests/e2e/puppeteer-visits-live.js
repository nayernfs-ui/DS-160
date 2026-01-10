// Copied and trimmed from tools/puppeteer-visits-live.js for stable e2e baseline
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err && (err.stack || err.message || err));
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err && (err.stack || err.message || err));
});

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
  const url = process.env.TARGET_URL || 'https://ds-160-fresh.vercel.app/';
  console.log('Target URL:', url);
  console.log('Visiting:', url);
  const extra = process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(' ') : [];
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    ...extra,
  ];
  const launchOpts = { headless: true, args, dumpio: true };
  if (process.env.PUPPETEER_EXECUTABLE_PATH)
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

  let browser;
  try {
    // try multiple launch fallbacks
    for (const opts of [launchOpts, Object.assign({}, launchOpts, { headless: false })]) {
      try {
        browser = await puppeteer.launch(opts);
        console.log('Browser launched. Creating new page...');
        break;
      } catch (e) {
        console.error('Browser launch attempt failed:', e && (e.stack || e.message || e));
      }
    }
    if (!browser) {
      throw new Error('All browser launch attempts failed');
    }
  } catch (e) {
    console.error('Failed to launch Puppeteer:', e && e.message ? e.message : e);
    await saveArtifacts(null, 'launch-failed');
    process.exit(2);
  }
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

  browser.on('disconnected', async () => {
    console.error('Browser disconnected event fired');
    await saveArtifacts(null, 'browser-disconnected');
  });
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
  page.on('console', (msg) => {
    try {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        args: msg.args().map((a) => String(a)),
      });
    } catch (e) {
      console.debug && console.debug('Ignored page console parsing error:', e && e.message);
    }
    console.log('PAGE LOG:', msg.text());
  });
  page.on('requestfinished', (req) => {
    try {
      console.log('Request finished:', req.url());
    } catch (e) {
      console.debug && console.debug('Ignored page requestfinished parsing error:', e && e.message);
    }
  });
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);

  try {
    console.log('Navigating to URL (soft load)...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Navigation completed (domcontentloaded).');
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

      // helper: try multiple selectors and return computed display or 'none' if not found
      const getDisplay = async (selectors) => {
        for (const s of selectors) {
          const el = await page.$(s);
          if (el) {
            return await page.evaluate((el) => window.getComputedStyle(el).display, el);
          }
        }
        return 'none';
      };

      const widowDisplay = await getDisplay(['#widowedFields']);
      const spouseDisplay = await getDisplay(['#marriedFields']);

      // Visual display checks
      if (widowDisplay !== 'none') {
        console.error(
          'E2E: widowedFields should be hidden when Married is selected; got',
          widowDisplay
        );
        await saveArtifacts(page, 'widow-visible');
        try {
          await browser.close();
        } catch (e) {
          console.debug && console.debug('Ignored error closing browser:', e && e.message);
        }
        process.exit(4);
      }

      if (spouseDisplay === 'none') {
        console.error(
          'E2E: marriedFields should be visible when Married is selected; got',
          spouseDisplay
        );
        await saveArtifacts(page, 'spouse-hidden');
        try {
          await browser.close();
        } catch (e) {
          console.debug && console.debug('Ignored error closing browser:', e && e.message);
        }
        process.exit(5);
      }

      // Accessibility assertions: verify aria-hidden / aria-expanded values
      const widowAria = await page.evaluate(() => {
        const el = document.getElementById('widowedFields');
        return el
          ? { hidden: el.getAttribute('aria-hidden'), expanded: el.getAttribute('aria-expanded') }
          : null;
      });
      const spouseAria = await page.evaluate(() => {
        const el = document.getElementById('marriedFields');
        return el
          ? { hidden: el.getAttribute('aria-hidden'), expanded: el.getAttribute('aria-expanded') }
          : null;
      });

      if (!widowAria || widowAria.hidden !== 'true' || widowAria.expanded !== 'false') {
        console.error('E2E: widowedFields ARIA mismatch:', widowAria);
        await saveArtifacts(page, 'widow-aria-mismatch');
        try {
          await browser.close();
        } catch (e) {
          console.debug && console.debug('Ignored error closing browser:', e && e.message);
        }
        process.exit(6);
      }
      if (!spouseAria || spouseAria.hidden !== 'false' || spouseAria.expanded !== 'true') {
        console.error('E2E: marriedFields ARIA mismatch:', spouseAria);
        await saveArtifacts(page, 'spouse-aria-mismatch');
        try {
          await browser.close();
        } catch (e) {
          console.debug && console.debug('Ignored error closing browser:', e && e.message);
        }
        process.exit(7);
      }

      console.log(
        'E2E: marital visibility & ARIA checks passed (Married shows spouse, hides widowed)'
      );

      // --- New check: Divorced selection should show former-spouse fields and hide others ---
      try {
        console.log('Testing Divorced selection...');
        await page.select('#maritalStatus', 'Divorced');
        await new Promise((r) => setTimeout(r, 200));

        const divorcedDisplay = await getDisplay(['#divorcedFields']);
        if (divorcedDisplay === 'none') {
          console.error(
            'E2E: divorcedFields should be visible when Divorced is selected; got',
            divorcedDisplay
          );
          await saveArtifacts(page, 'divorced-hidden');
          try {
            await browser.close();
          } catch (e) {
            console.debug && console.debug('Ignored error closing browser:', e && e.message);
          }
          process.exit(8);
        }

        const divorcedAria = await page.evaluate(() => {
          const el = document.getElementById('divorcedFields');
          return el
            ? { hidden: el.getAttribute('aria-hidden'), expanded: el.getAttribute('aria-expanded') }
            : null;
        });

        const marriedAriaAfter = await page.evaluate(() => {
          const el = document.getElementById('marriedFields');
          return el ? el.getAttribute('aria-hidden') : null;
        });

        if (!divorcedAria || divorcedAria.hidden !== 'false' || divorcedAria.expanded !== 'true') {
          console.error('E2E: divorcedFields ARIA mismatch:', divorcedAria);
          await saveArtifacts(page, 'divorced-aria-mismatch');
          try {
            await browser.close();
          } catch (e) {
            console.debug && console.debug('Ignored error closing browser:', e && e.message);
          }
          process.exit(9);
        }

        if (marriedAriaAfter !== 'true') {
          console.error(
            'E2E: marriedFields should be hidden when Divorced is selected; got',
            marriedAriaAfter
          );
          await saveArtifacts(page, 'married-aria-after');
          try {
            await browser.close();
          } catch (e) {
            console.debug && console.debug('Ignored error closing browser:', e && e.message);
          }
          process.exit(10);
        }

        console.log('E2E: Divorced visibility & ARIA checks passed');
      } catch (err) {
        console.error(
          'E2E divorced visibility check failed:',
          err && err.message ? err.message : err
        );
        await saveArtifacts(page, 'divorced-check-failed');
        try {
          await browser.close();
        } catch (e) {
          console.debug && console.debug('Ignored error closing browser:', e && e.message);
        }
        process.exit(3);
      }
    } catch (err) {
      console.error('E2E marital visibility check failed:', err && err.message ? err.message : err);
      await saveArtifacts(page, 'marital-check-failed');
      try {
        await browser.close();
      } catch (e) {
        console.debug && console.debug('Ignored error closing browser:', e && e.message);
      }
      process.exit(3);
    }
  } catch (e) {
    console.error('Interaction failed:', e && e.message ? e.message : e);
    await saveArtifacts(page, 'interaction-failed');
    try {
      await browser.close();
    } catch (e) {
      console.debug && console.debug('Ignored error closing browser:', e && e.message);
    }
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
  await saveArtifacts(page, 'tab-check-failed');
  try {
    await browser.close();
  } catch (e) {
    console.debug && console.debug('Ignored error closing browser:', e && e.message);
  }
  process.exit(1);
})();
