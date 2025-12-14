const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun } = docx;
(async () => {
  const doc = new Document({
    sections: [{ children: [new Paragraph({ children: [new TextRun('Hello World')] })] }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync('simple.docx', buf);
  console.log('Simple docx written');
})();
