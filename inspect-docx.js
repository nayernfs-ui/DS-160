const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

(async () => {
  const docxPath = path.resolve(__dirname, 'test_output_docx_1765628126793.docx');
  if (!fs.existsSync(docxPath)) return console.error('Docx not found:', docxPath);
  const data = fs.readFileSync(docxPath);
  const zip = await JSZip.loadAsync(data);
  const docXmlStr = await zip.file('word/document.xml').async('string');
  console.log('StartsWith <?xml?>:', docXmlStr.trim().startsWith('<?xml'));
  console.log('Length:', docXmlStr.length);
  console.log('First 200 chars:');
  console.log(docXmlStr.substring(0, 200));

  // Look for any invalid XML char per XML 1.0: chars < 0x20 except 0x09,0x0A,0x0D are invalid.
  const invalid = [];
  for (let i = 0; i < docXmlStr.length && i < 10000; i++) {
    const ch = docXmlStr.charCodeAt(i);
    if (ch < 0x20 && ch !== 0x09 && ch !== 0x0A && ch !== 0x0D) invalid.push({index:i, code:ch});
  }
  console.log('Found invalid control chars (<0x20) count:', invalid.length);
  if (invalid.length) console.log(invalid.slice(0,10));
  // Inspect relationships
  if (zip.file('word/_rels/document.xml.rels')) {
    const rels = await zip.file('word/_rels/document.xml.rels').async('string');
    console.log('\ndocument.xml.rels length:', rels.length);
    console.log('Full rels content:\n', rels);
  } else {
    console.warn('No document.xml.rels found');
  }

  // Inspect content types
  if (zip.file('[Content_Types].xml')) {
    const types = await zip.file('[Content_Types].xml').async('string');
    console.log('\n[Content_Types].xml length:', types.length);
    console.log(types.substring(0, 400));
  } else {
    console.warn('No [Content_Types].xml found');
  }
  // Required parts check
  const requiredFiles = [
    '[Content_Types].xml',
    '_rels/.rels',
    'word/document.xml',
    'word/_rels/document.xml.rels',
    'word/styles.xml'
  ];
  console.log('\nRequired files:');
  for (const f of requiredFiles) {
    console.log(f, 'exists?', !!zip.file(f));
  }
})();
