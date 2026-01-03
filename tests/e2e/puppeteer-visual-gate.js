const puppeteer = require('puppeteer');
const path = require('path');
/* global updateMaritalFields, updateProgressBar */
(async () => {
  console.log('TEST START');
  // Use an existing local dev server if available (e.g., `npm start` / dev server)
  const file = process.env.TARGET_URL || 'http://127.0.0.1:3000/';
  console.log('Using target URL:', file);
  const FORCE_SET_CONTENT = process.env.FORCE_SET_CONTENT
    ? process.env.FORCE_SET_CONTENT === 'true'
    : false; // allow env override; default to false so local server navigation is used
  console.log('Launching browser');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    dumpio: false,
  });
  console.log('Browser launched');
  const page = await browser.newPage();
  console.log('New page created');

  // Mimic the live test's environment settings
  try {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(ua);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  } catch (err) {
    console.warn('Failed to set UA/headers:', err && err.message ? err.message : err);
  }
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) =>
    console.error('Page runtime error:', err && err.stack ? err.stack : err)
  );
  page.on('requestfailed', (req) => console.error('Request failed:', req.url()));
  page.on('request', (req) => console.log('REQ', req.url()));
  page.on('response', (res) => console.log('RES', res.status(), res.url()));
  try {
    try {
      // Prefer navigating to an HTTP URL so DOMContentLoaded handlers fire normally
      console.log('Navigating to', file);
      if (FORCE_SET_CONTENT) throw new Error('forced fallback');
      await page.goto(file, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('PAGE LOADED');

      // Capture initial readiness flag after normal navigation and wait for transition
      try {
        const initialReady = await page.evaluate(() =>
          typeof window.__ds160Ready !== 'undefined' ? window.__ds160Ready : undefined
        );
        console.log('READY FLAG AFTER NAV:', initialReady);
        try {
          await page.waitForFunction('window.__ds160Ready === true', { timeout: 5000 });
          console.log('Detected window.__ds160Ready === true after navigation');
        } catch (e) {
          console.warn('window.__ds160Ready not detected after navigation within 5000ms');
        }
      } catch (e) {
        console.warn(
          'Failed to query __ds160Ready after navigation:',
          e && e.message ? e.message : e
        );
      }
    } catch (e) {
      console.warn(
        'PAGE NAVIGATION FAILED, falling back to setContent:',
        e && e.message ? e.message : e
      );
      try {
        const htmlPath = path.resolve(__dirname, '../../public/index.html');
        const cssPath = path.resolve(__dirname, '../../public/style.css');
        const jsPath = path.resolve(__dirname, '../../public/js/script.js');
        const html = require('fs').readFileSync(htmlPath, 'utf8');
        await page.setContent(html);
        console.log('PAGE SET FROM FILE (fallback)');
        // inject CSS and JS so the page behavior is initialized even when navigation fails
        try {
          await page.addStyleTag({ path: cssPath });
          console.log('Injected style.css');
        } catch (e) {
          console.warn('Failed to inject style.css:', e && e.message ? e.message : e);
        }
        try {
          await page.addScriptTag({ path: jsPath });
          console.log('Injected script.js');
        } catch (e) {
          console.warn('Failed to inject script.js:', e && e.message ? e.message : e);
        }

        // Prefer calling exported initializer for injected scripts. When scripts are injected
        // after DOMContentLoaded we may need to wait briefly for the init to be attached.
        try {
          await page.waitForFunction('typeof window.initDs160 === "function"', { timeout: 2000 });
          await page.evaluate(() => window.initDs160());
          console.log('Called window.initDs160()');
          try {
            await page.waitForFunction('window.__ds160Ready === true', { timeout: 5000 });
            console.log('Detected window.__ds160Ready === true after init call');
          } catch (e) {
            console.warn('window.__ds160Ready not detected after init call');
          }
        } catch (e) {
          console.warn(
            'initDs160 not available; will dispatch DOMContentLoaded after short delay to give injected script a chance to register listeners'
          );
          // wait briefly for the injected script to finish executing and register its listeners
          await new Promise((r) => setTimeout(r, 250));
          await page.evaluate(() => {
            window.dispatchEvent(new Event('DOMContentLoaded'));
          });
          const helpersNow = await page.evaluate(() => ({
            init: typeof window.initDs160,
            update: typeof window.updateProgressBar,
            marital: typeof window.updateMaritalFields,
            readyFlag: typeof window.__ds160Ready !== 'undefined' ? window.__ds160Ready : undefined,
          }));
          console.log('HELPERS AFTER DISPATCH:', helpersNow);

          // If init became available after we dispatched DOMContentLoaded, call it explicitly
          try {
            await page.evaluate(() => {
              if (typeof window.initDs160 === 'function') {
                try {
                  window.initDs160();
                  console.log('Called window.initDs160() after dispatch');
                } catch (err) {
                  console.warn(
                    'initDs160 call error after dispatch',
                    err && err.message ? err.message : err
                  );
                }
              } else {
                console.log('initDs160 still not present after dispatch');
              }
            });
          } catch (err) {
            console.warn(
              'Error while attempting post-dispatch init:',
              err && err.message ? err.message : err
            );
          }

          // Wait explicitly for the page readiness flag set by the app when init completes
          try {
            await page.waitForFunction('window.__ds160Ready === true', { timeout: 5000 });
            console.log('Detected window.__ds160Ready === true');
          } catch (e) {
            console.warn('window.__ds160Ready not detected within 5000ms');
          }
        }

        // If available, repeatedly call updateMaritalFields/updateProgressBar until progress shows
        console.log(
          'ENTERING PROGRESS POLL; PROGRESS_TIMEOUT_MS=',
          process.env.PROGRESS_TIMEOUT_MS
        );
        const PROGRESS_TIMEOUT = Number(process.env.PROGRESS_TIMEOUT_MS) || 8000;
        const progressFound = await page.evaluate(async (timeout) => {
          if (typeof updateMaritalFields === 'function') {
            try {
              updateMaritalFields();
              console.log('FALLBACK LOOP: updateMaritalFields called');
            } catch (e) {
              /* swallow */
            }
          }
          const start = Date.now();
          while (Date.now() - start < timeout) {
            console.log(
              'FALLBACK LOOP: tick, hasUpdate',
              typeof updateProgressBar === 'function',
              'ready',
              typeof window.__ds160Ready !== 'undefined' ? window.__ds160Ready : '(undef)'
            );
            if (typeof updateProgressBar === 'function') {
              try {
                updateProgressBar();
                console.log('FALLBACK LOOP: updateProgressBar invoked');
              } catch (e) {
                console.log(
                  'FALLBACK LOOP: updateProgressBar error',
                  e && e.message ? e.message : e
                );
              }
            }
            await new Promise((r) => setTimeout(r, 200));
            const pr = document.querySelector('.progress');
            const bar = document.querySelector('.progress-bar');
            if (pr) {
              console.log(
                'FALLBACK LOOP: progress element',
                pr.tagName,
                'value',
                pr.value || pr.getAttribute('aria-valuenow'),
                'barStyle',
                bar ? bar.style.width : null
              );
              if (bar && bar.style.width && bar.style.width !== '0%') return true;
              if (pr.tagName && pr.tagName.toUpperCase() === 'PROGRESS' && Number(pr.value) > 0)
                return true;
            } else {
              console.log('FALLBACK LOOP: no progress element found');
            }
          }
          return false;
        }, PROGRESS_TIMEOUT);
        console.log('Manually initialized page JS');
        if (progressFound) console.log('Progress updated by injected script (detected in loop)');
        else
          console.warn('Progress did not update within loop timeout, continuing with measurements');

        // Inspect what helper functions were attached to window after initialization
        const globalHelpers = await page.evaluate(() =>
          Object.keys(window).filter((k) => /update|init|marital/i.test(k))
        );
        console.log(
          'GLOBAL HELPERS:',
          globalHelpers && globalHelpers.length ? globalHelpers.join(', ') : '(none)'
        );
      } catch (err) {
        console.error('PAGE SET FAILED:', err && err.message ? err.message : err);
        await browser.close();
        process.exit(6);
      }
    }
    // wait for marital select
    await page.waitForSelector('#maritalStatus', { visible: true, timeout: 5000 });
    console.log('MARRITAL SELECT READY');

    // helper to read progress
    const readProgress = async () => {
      return page.evaluate(() => {
        const pr = document.querySelector('.progress');
        const bar = document.querySelector('.progress-bar');
        if (!pr) return null;
        if (bar) {
          const aria = pr.getAttribute('aria-valuenow');
          const styleWidth = bar.style.width; // e.g., '50%'
          const computed = getComputedStyle(bar).width;
          const containerWidth = getComputedStyle(pr).width;
          return { aria: aria ? Number(aria) : null, styleWidth, computed, containerWidth };
        }
        // handle native <progress>
        if (pr.tagName && pr.tagName.toUpperCase() === 'PROGRESS') {
          const val = Number(pr.value) || 0;
          const containerWidth = getComputedStyle(pr).width;
          const numeric = parseFloat(containerWidth) || 0;
          const computed = (numeric * val) / 100 + 'px';
          const styleWidth = val + '%';
          return { aria: val, styleWidth, computed, containerWidth };
        }
        return null;
      });
    };

    // Scroll to 50%
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
    await new Promise((r) => setTimeout(r, 350));
    const mid = await readProgress();

    // Scroll to 100%
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 350));
    const full = await readProgress();

    // Trigger Divorced
    await page.select('#maritalStatus', 'Divorced');
    // dispatch change in case select doesn't trigger programmatically
    await page.evaluate(() =>
      document.getElementById('maritalStatus').dispatchEvent(new Event('change'))
    );

    // After programmatic change, explicitly call any update helpers repeatedly to ensure
    // the fields and progress are updated in the fallback environment.
    await page.evaluate(async () => {
      const timeout = 3000;
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (typeof updateMaritalFields === 'function') {
          try {
            updateMaritalFields();
          } catch (e) {
            /* swallow */
          }
        }
        if (typeof updateProgressBar === 'function') {
          try {
            updateProgressBar();
          } catch (e) {
            /* swallow */
          }
        }
        await new Promise((r) => setTimeout(r, 150));
        const el = document.getElementById('divorcedFields');
        if (el) {
          const visible = el.classList.contains('is-visible');
          const opacity = parseFloat(getComputedStyle(el).opacity) || 0;
          const pr = document.querySelector('.progress');
          const bar = document.querySelector('.progress-bar');
          const progressShown =
            (bar && bar.style.width && bar.style.width !== '0%') ||
            (pr && pr.tagName && pr.tagName.toUpperCase() === 'PROGRESS' && Number(pr.value) > 0);
          if (visible && opacity === 1 && progressShown) break;
        }
      }
    });

    await new Promise((r) => setTimeout(r, 400)); // wait for CSS transition

    // Check divorcedFields class and opacity
    const divorcedInfo = await page.evaluate(() => {
      const el = document.getElementById('divorcedFields');
      if (!el) return { exists: false };
      const has = el.classList.contains('is-visible');
      const opacity = parseFloat(getComputedStyle(el).opacity);
      return { exists: true, has, opacity };
    });

    const result = { mid, full, divorcedInfo };
    console.log(JSON.stringify(result, null, 2));

    // Determine pass/fail
    const pass =
      mid &&
      (mid.aria !== null || mid.styleWidth) &&
      full &&
      (full.aria !== null || full.styleWidth) &&
      divorcedInfo.exists &&
      divorcedInfo.has &&
      divorcedInfo.opacity === 1;

    await browser.close();
    process.exit(pass ? 0 : 2);
  } catch (e) {
    console.error('ERROR', e);
    await browser.close();
    process.exit(3);
  }
})();
