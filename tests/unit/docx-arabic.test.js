const assert = require('assert');
const JSZip = require('jszip');
const submit = require('../api/submit');

(async function run() {
  try {
    console.log('docx-arabic.test: starting');
    const sample = { FullName: 'محمد علي', FirstName_Arabic: 'محمد' };
    const { buffer, processedData } = await submit.generateDocument(sample, {
      returnProcessedData: true,
      includeHeaderImage: false,
    });

    // Basic checks
    if (!Buffer.isBuffer(buffer)) throw new Error('generateDocument did not return a Buffer');
    assert(processedData && processedData.FullName, 'processedData.FullName missing');

    // check processedData contains Arabic in one form (include presentation forms)
    const arabicRegex = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasArabicInProcessed = arabicRegex.test(processedData.FullName);

    // check docx xml contains Arabic characters (or contains the sample string characters in-order)
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml').async('string');
    const hasArabicInDoc = arabicRegex.test(docXml);

    // Fallback: check that the raw sample characters appear in-order inside the xml (use containsInOrder)
    const sampleVal = sample.FullName;
    const foundInOrder = (function containsInOrder(text, sub) {
      let lastIndex = -1;
      for (const ch of Array.from(sub)) {
        lastIndex = text.indexOf(ch, lastIndex + 1);
        if (lastIndex === -1) return false;
      }
      return true;
    })(docXml, sampleVal);

    console.log('ProcessedData.FullName:', processedData.FullName);
    console.log('hasArabicInProcessed:', hasArabicInProcessed);
    console.log('hasArabicInDoc:', hasArabicInDoc);
    console.log('foundInOrder:', foundInOrder);

    if (!hasArabicInProcessed && !hasArabicInDoc && !foundInOrder) {
      throw new Error('No Arabic characters found in processed data or generated DOCX');
    }

    console.log('docx-arabic.test: PASS');
    process.exit(0);
  } catch (err) {
    console.error('docx-arabic.test: FAIL');
    console.error(err);
    process.exit(1);
  }
})();
