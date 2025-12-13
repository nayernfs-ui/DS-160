const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const submit = require('./api/submit.js');

(async () => {
  const sampleFormData = { FullName: 'محمد علي' };
  // Generate with image
  const bufWith = await submit.generateDocument(sampleFormData, { returnProcessedData: false });
  const withPath = path.resolve(__dirname, 'test_with_header.docx');
  fs.writeFileSync(withPath, bufWith);
  const zipWith = await JSZip.loadAsync(bufWith);
  const docXmlWith = await zipWith.file('word/document.xml').async('string');

  // Generate without image
  const bufNo = await submit.generateDocument(sampleFormData, { includeHeaderImage: false });
  const noPath = path.resolve(__dirname, 'test_no_header.docx');
  fs.writeFileSync(noPath, bufNo);
  const zipNo = await JSZip.loadAsync(bufNo);
  const docXmlNo = await zipNo.file('word/document.xml').async('string');

  console.log('with length', docXmlWith.length);
  console.log('no length', docXmlNo.length);
  console.log('\nWith Header starts:', docXmlWith.substring(0, 500));
  console.log('\nNo Header starts:', docXmlNo.substring(0, 500));

  // Find first image blip reference in with header
  const blipIdx = docXmlWith.indexOf('r:embed="rId');
  console.log('\nFirst r:embed index in with file:', blipIdx);
  if (blipIdx !== -1) console.log(docXmlWith.substring(Math.max(0, blipIdx - 200), blipIdx + 200));

  const blipIdxNo = docXmlNo.indexOf('r:embed="rId');
  console.log('First r:embed index in no-header file:', blipIdxNo);
})();
