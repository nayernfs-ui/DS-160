const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async function testToggle() {
  console.log('Testing centralized radio toggle handler...\n');

  try {
    // Load HTML
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Load script
    const scriptPath = path.join(__dirname, 'public', 'js', 'script.js');
    const script = fs.readFileSync(scriptPath, 'utf8');

    // Clean HTML of script tags
    const cleanedHtml = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
    const combined = cleanedHtml.replace('</body>', `<script>${script}</script></body>`);

    // Create JSDOM
    const dom = new JSDOM(combined, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: `file://${__dirname}/public/index.html`,
    });

    // Wait for scripts to initialize
    await new Promise((r) => setTimeout(r, 100));

    const doc = dom.window.document;

    console.log('✓ DOM Loaded');
    console.log('');

    // Test 1: Lost Passport toggle
    console.log('TEST 1: Lost Passport Toggle');
    const lostPassportYes = doc.querySelector('input[name="LostPassport"][value="Yes"]');
    const lostPassportDetails = doc.getElementById('lost_passport_details');

    if (!lostPassportYes) {
      console.error('✗ LostPassport Yes radio not found');
    } else if (!lostPassportDetails) {
      console.error('✗ lost_passport_details container not found');
    } else {
      const beforeDisplay = dom.window.getComputedStyle(lostPassportDetails).display;
      console.log(`  Initial display: ${beforeDisplay}`);

      lostPassportYes.checked = true;
      lostPassportYes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

      await new Promise((r) => setTimeout(r, 50));

      const afterDisplay = dom.window.getComputedStyle(lostPassportDetails).display;
      console.log(`  After clicking Yes: ${afterDisplay}`);

      if (afterDisplay === 'block' || afterDisplay === 'flex' || afterDisplay !== 'none') {
        console.log('✓ Lost Passport toggle works\n');
      } else {
        console.error('✗ Lost Passport toggle failed - still hidden\n');
      }
    }

    // Test 2: Relatives toggle
    console.log('TEST 2: US_ImmediateRelatives Toggle');
    const relYes = doc.querySelector('input[name="US_ImmediateRelatives"][value="Yes"]');
    const relContainer = doc.getElementById('US_Relatives_Container');
    const relDetails = doc.getElementById('relative_details');

    if (!relYes) {
      console.error('✗ US_ImmediateRelatives Yes radio not found');
    } else if (!relContainer) {
      console.error('✗ US_Relatives_Container not found');
    } else {
      const beforeDisplay = dom.window.getComputedStyle(relContainer).display;
      console.log(`  Initial container display: ${beforeDisplay}`);

      relYes.checked = true;
      relYes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

      await new Promise((r) => setTimeout(r, 50));

      const afterDisplay = dom.window.getComputedStyle(relContainer).display;
      console.log(`  After clicking Yes: ${afterDisplay}`);

      if (afterDisplay === 'block' || afterDisplay === 'flex' || afterDisplay !== 'none') {
        console.log('✓ Relatives toggle works\n');
      } else {
        console.error('✗ Relatives toggle failed - still hidden\n');
      }
    }

    // Test 3: US_OtherRelatives toggle
    console.log('TEST 3: US_OtherRelatives Toggle');
    const otherRelYes = doc.querySelector('input[name="US_OtherRelatives"][value="Yes"]');

    if (!otherRelYes) {
      console.error('✗ US_OtherRelatives Yes radio not found');
    } else if (!relContainer) {
      console.error('✗ US_Relatives_Container not found');
    } else {
      // Reset first
      const relNo = doc.querySelector('input[name="US_ImmediateRelatives"][value="No"]');
      if (relNo) {
        relNo.checked = true;
        relNo.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 50));
      }

      const beforeDisplay = dom.window.getComputedStyle(relContainer).display;
      console.log(`  Initial container display: ${beforeDisplay}`);

      otherRelYes.checked = true;
      otherRelYes.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

      await new Promise((r) => setTimeout(r, 50));

      const afterDisplay = dom.window.getComputedStyle(relContainer).display;
      console.log(`  After clicking Yes: ${afterDisplay}`);

      if (afterDisplay === 'block' || afterDisplay === 'flex' || afterDisplay !== 'none') {
        console.log('✓ Other Relatives toggle works\n');
      } else {
        console.error('✗ Other Relatives toggle failed - still hidden\n');
      }
    }

    console.log('✓ All tests completed');
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
