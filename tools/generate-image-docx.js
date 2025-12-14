const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, ImageRun, AlignmentType } = docx;
(async () => {
  const imagePath = './assets/ds160_header.png';
  const imageBuf = fs.readFileSync(imagePath);
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuf,
                type: 'png',
                transformation: { width: 200, height: 80 },
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync('image-docx.docx', buf);
  console.log('Wrote image-docx.docx');
})();
