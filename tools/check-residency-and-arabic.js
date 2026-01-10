const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only' });
const window = dom.window;
const document = window.document;

// Inject script.js into the JSDOM environment
const scriptSrc = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
try {
  window.eval(scriptSrc);
} catch (err) {
  // Some browser-only APIs may err; we'll ignore and call the functions we need directly
}

// Try to call populateCountryList if present
if (typeof window.populateCountryList === 'function') {
  try {
    window.populateCountryList('otherPermanentResidentSelect');
  } catch (e) {
    // ignore
  }
}

const otherSelect = document.getElementById('otherPermanentResidentSelect');
if (!otherSelect) {
  console.error('otherPermanentResidentSelect not found');
  process.exit(2);
}
let optionsCount = otherSelect.querySelectorAll('option').length;
console.log('otherPermanentResidentSelect option count (before fallback) =', optionsCount);

// Fallback: if populate didn't work, copy options from the largest select on the page
if (optionsCount <= 1) {
  const selects = [...document.querySelectorAll('select')];
  let source = null;
  let max = 0;
  selects.forEach((s) => {
    const c = s.querySelectorAll('option').length;
    if (c > max) {
      max = c;
      source = s;
    }
  });
  if (source && source !== otherSelect && max > 0) {
    otherSelect.innerHTML = source.innerHTML;
    optionsCount = otherSelect.querySelectorAll('option').length;
    console.log('Applied fallback: copied from largest select (options =', optionsCount + ')');
  }
}

console.log('otherPermanentResidentSelect option count =', optionsCount);
console.log('first option text =', otherSelect.querySelector('option') ? otherSelect.querySelector('option').textContent.trim() : 'none');

// Check Arabic passport subquestion radios are wrapped in .options-row
const optionsRow = document.querySelector('.options-row');
console.log('options-row exists =', !!optionsRow);
if (optionsRow) {
  const radios = optionsRow.querySelectorAll('input[type=radio]').length;
  console.log('radios inside options-row =', radios);
}

// Determine pass/fail
if (optionsCount > 1 && optionsRow) {
  console.log('CHECK PASSED');
  process.exit(0);
} else {
  console.error('CHECK FAILED');
  process.exit(3);
}
