const fs = require('fs');
const JSZip = require('jszip');
const { DOMParser } = require('xmldom');

(async function () {
  try {
    const names = fs
      .readdirSync(process.cwd())
      .filter((f) => f.startsWith('test_output_docx_') && f.endsWith('.docx'))
      .sort();
    const name = names.pop();
    if (!name) {
      console.error('No docx found');
      process.exit(1);
    }
    const buf = fs.readFileSync(name);
    const zip = await JSZip.loadAsync(buf);

    const list = Object.keys(zip.files).sort();
    const reportLines = [];
    reportLines.push('Zip entries:');
    list.forEach((n) => reportLines.push('  ' + n));

    const xmlFiles = Object.keys(zip.files).filter((n) => n.endsWith('.xml'));
    for (const xmlFile of xmlFiles) {
      try {
        const xmlStr = await zip.file(xmlFile).async('string');
        reportLines.push('\n---- ' + xmlFile + ' length: ' + xmlStr.length);
        reportLines.push('First 200 chars: ' + xmlStr.substring(0, 200).replace(/\r?\n/g, '\\n'));
        try {
          const dom = new DOMParser().parseFromString(xmlStr, 'text/xml');
          reportLines.push('XML parsed ok. Root: ' + dom.documentElement.nodeName);
        } catch (err) {
          reportLines.push('XML parse error: ' + err.message);
        }
      } catch (err) {
        reportLines.push('\nFailed to read ' + xmlFile + ': ' + err.message);
      }
    }

    // illegal control characters across all xml parts
    const illegal = [];
    for (const xmlFile of xmlFiles) {
      try {
        const xmlStr = await zip.file(xmlFile).async('string');
        for (let i = 0; i < xmlStr.length; i++) {
          const code = xmlStr.charCodeAt(i);
          if (
            (code >= 0 && code <= 8) ||
            (code >= 11 && code <= 12) ||
            (code >= 14 && code <= 31)
          ) {
            illegal.push({ file: xmlFile, index: i, code });
            if (illegal.length >= 10) break;
          }
        }
        if (illegal.length >= 10) break;
      } catch (e) {
        /* ignore */
      }
    }
    reportLines.push('\nIllegal control char count: ' + illegal.length);
    if (illegal.length) reportLines.push(JSON.stringify(illegal.slice(0, 10)));

    // detect unescaped ampersands
    const badAmp = [];
    const re = /&(?!amp;|lt;|gt;|quot;|apos;|#)/g;
    let m;
    const docXmlStr = await zip.file('word/document.xml').async('string');
    while ((m = re.exec(docXmlStr)) !== null) {
      badAmp.push({
        index: m.index,
        snippet: docXmlStr.substring(Math.max(0, m.index - 20), m.index + 20),
      });
      if (badAmp.length >= 20) break;
    }
    reportLines.push('\nUnescaped & occurrences: ' + badAmp.length);
    if (badAmp.length) reportLines.push(JSON.stringify(badAmp.slice(0, 10)));

    // rId checks
    const rIdMatches = (docXmlStr.match(/r:id="(rId[0-9]+)"/g) || []).map((s) => s.slice(5, -1));
    const relsStr = await zip.file('word/_rels/document.xml.rels').async('string');
    const relTargets = (relsStr.match(/Target="([^"]+)"/g) || []).map((s) => s.slice(8, -1));
    const missing = rIdMatches.filter((r) => !relsStr.includes(r));
    reportLines.push('\nFound rIds in document.xml: ' + rIdMatches.length);
    reportLines.push('\nFound rel targets: ' + relTargets.length);
    reportLines.push('\nMissing rIds: ' + missing.length);
    if (missing.length) reportLines.push(JSON.stringify(missing));

    // content types
    const ctStr = await zip.file('[Content_Types].xml').async('string');
    reportLines.push('\n[Content_Types].xml length: ' + ctStr.length);

    fs.writeFileSync('validation_report.txt', reportLines.join('\n'));
    console.log('Wrote validation_report.txt');
  } catch (e) {
    console.error('Validation failed', e);
    process.exit(1);
  }
})();
