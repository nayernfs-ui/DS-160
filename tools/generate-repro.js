const fs = require('fs');
const docx = require('docx');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} = docx;

(async () => {
  const imagePath = './assets/ds160_header.png';
  const imageBuf = fs.readFileSync(imagePath);

  const titleParagraph = new Paragraph({
    children: [new TextRun({ text: 'DS-160 Submission Report', bold: true, size: 32 })],
    alignment: AlignmentType.CENTER,
  });

  const dateParagraph = new Paragraph({
    children: [new TextRun('Date: 12/13/2025')],
    alignment: AlignmentType.LEFT,
  });

  const tableRows = [];

  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Question', bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Answer', bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      ],
    })
  );

  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Full Name (Arabic)', bold: true })],
              alignment: AlignmentType.LEFT,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'ﻲﻠﻋ ﺪﻤﺤﻣ', rtl: true, font: { name: 'Arial' } })],
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            }),
          ],
        }),
      ],
    })
  );

  const dataTable = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3000, 7000],
  });

  const children = [];
  children.push(
    new Paragraph({
      children: [
        new ImageRun({ data: imageBuf, type: 'png', transformation: { width: 500, height: 100 } }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );
  children.push(titleParagraph);
  children.push(dateParagraph);
  children.push(dataTable);

  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync('repro.docx', buf);
  console.log('Wrote repro.docx');
})();
