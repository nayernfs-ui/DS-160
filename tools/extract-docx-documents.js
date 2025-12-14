const fs = require('fs');
const JSZip = require('jszip');
(async () => {
  const files = fs
    .readdirSync('.')
    .filter((f) => f.startsWith('test_output_docx_') && f.endsWith('.docx'))
    .sort();
  if (!files.length) {
    console.error('No files');
    return;
  }
  for (const f of files) {
    const zip = await JSZip.loadAsync(fs.readFileSync(f));
    const docXml = await zip.file('word/document.xml').async('string');
    fs.writeFileSync(`docxml_${f}.xml`, docXml, 'utf8');
    console.log('Wrote docxml_' + f + '.xml');
  }
})();
