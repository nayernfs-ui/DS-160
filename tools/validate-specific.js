const fs = require('fs');
const JSZip = require('jszip');
const { DOMParser } = require('xmldom');
(async () => {
  const f = 'noheader.docx';
  if (!fs.existsSync(f)) {
    console.error('noheader.docx missing');
    process.exit(1);
  }
  const zip = await JSZip.loadAsync(fs.readFileSync(f));
  const docXml = await zip.file('word/document.xml').async('string');
  try {
    new DOMParser().parseFromString(docXml, 'text/xml');
    console.log('No header -> document.xml parsed ok length', docXml.length);
  } catch (e) {
    console.error('No header -> parse failed', e.message);
  }
  const ms = docXml.match(/r:id="(rId[0-9]+)"/g) || [];
  console.log('rIds found', ms.length);
  const rels = await zip.file('word/_rels/document.xml.rels').async('string');
  console.log('rels length', rels.length);
})();
