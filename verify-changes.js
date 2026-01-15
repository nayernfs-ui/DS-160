#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('Verifying US visit details toggle feature...\n');

const files = [
  'index.html',
  'public/index.html',
  'preview_remote.html'
];

const scriptFiles = [
  'script.js',
  'public/js/script.js'
];

let allPassed = true;

// Check HTML files
files.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file}: NOT FOUND`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasYesToggle = content.includes('onclick="toggleUSVisits(true)"');
  const hasNoToggle = content.includes('onclick="toggleUSVisits(false)"');
  const hasVisitDiv = content.includes('id="us_visit_details"');
  const hasHiddenStyle = content.includes('style="display: none');
  
  const passed = hasYesToggle && hasNoToggle && hasVisitDiv && hasHiddenStyle;
  
  console.log(`${file}:`);
  console.log(`  ✓ Yes toggle: ${hasYesToggle ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ No toggle: ${hasNoToggle ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ Visit details div: ${hasVisitDiv ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ Hidden by default: ${hasHiddenStyle ? 'PASS' : 'FAIL'}`);
  console.log(`  Overall: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (!passed) allPassed = false;
});

// Check script files
scriptFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file}: NOT FOUND`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasToggleFunction = content.includes('function toggleUSVisits(show)');
  const hasDocumentGetElementById = content.includes("document.getElementById('us_visit_details')");
  const hasBlockDisplay = content.includes("'block'");
  
  const passed = hasToggleFunction && hasDocumentGetElementById && hasBlockDisplay;
  
  console.log(`${file}:`);
  console.log(`  ✓ toggleUSVisits function: ${hasToggleFunction ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ getElementById call: ${hasDocumentGetElementById ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ Display toggle: ${hasBlockDisplay ? 'PASS' : 'FAIL'}`);
  console.log(`  Overall: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (!passed) allPassed = false;
});

process.exit(allPassed ? 0 : 1);
