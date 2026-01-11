const fs = require('fs');
const JSZip = require('jszip');
const { XMLParser } = require('fast-xml-parser');

(async function () {
  const files = fs
    .readdirSync(process.cwd())
    .filter((f) => f.startsWith('test_output_docx_') && f.endsWith('.docx'))
    .sort();
  const name = files.pop();
  if (!name) {
    console.error('No docx files found');
    process.exit(1);
  }
  console.log('Inspecting', name);
  const buf = fs.readFileSync(name);
  const zip = await JSZip.loadAsync(buf);
  const list = Object.keys(zip.files).sort();
  console.log('Entries:', list.join('\n'));
  const docXmlStr = await zip.file('word/document.xml').async('string');
  console.log('\ndocument.xml length:', docXmlStr.length);
  console.log('\nFirst 400 chars:');
  console.log(docXmlStr.substring(0, 400));
  console.log('\nLast 200 chars:');
  console.log(docXmlStr.substring(docXmlStr.length - 200));
  try {
    const parser = new XMLParser({ ignoreDeclaration: true, ignoreAttributes: false });
    const obj = parser.parse(docXmlStr);
    const root = Object.keys(obj)[0];
    console.log('\nXML parsed ok. Root element:', root);
  } catch (err) {
    console.error('\nXML parse error:', err);
  }
  // Detect illegal XML chars
  const illegal = [];
  for (let i = 0; i < docXmlStr.length; i++) {
    const code = docXmlStr.charCodeAt(i);
    if ((code >= 0 && code <= 8) || (code >= 11 && code <= 12) || (code >= 14 && code <= 31)) {
      illegal.push({ index: i, code, chr: docXmlStr[i] });
      if (illegal.length >= 20) break;
    }
  }
  console.log('\nIllegal XML chars count:', illegal.length);
  if (illegal.length) console.log(illegal.slice(0, 10));

  // Check for non-standard namespace declarations duplicated incorrectly
  const nsWrong = docXmlStr.match(/mc:Ignorable\s*=\s*"[^"]+"/g);
  console.log('\nmc:Ignorable matches:', (nsWrong && nsWrong.length) || 0);

  // Validate that body has at least one <w:body>
  if (docXmlStr.includes('<w:body')) console.log('\nHas <w:body> tag');
  else console.log('\nMissing <w:body>!');
})();
