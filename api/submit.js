// --- NEW CODE INCLUDING PDF GENERATION AND ATTACHMENT ---

const SibApiV3Sdk = require('sib-api-v3-sdk');
const fs = require('fs');
const path = require('path');
const docx = require('docx');
// *** FIX HERE: ADD Table, TableRow, TableCell, WidthType ***
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} = docx;
// Import Reshaper to ensure Arabic shaping works for Word output
const ReshaperModule = require('arabic-reshaper');

// We use `arabic-reshaper` to ensure Arabic text is shaped correctly for Word
// Docx will handle font embedding at client side or server if fonts are available.

// (Removed local TTF font path - we're using the VFS fonts via pdfmake)

// Configuration (using existing environment variables)
// Prefer SENDINBLUE_API_KEY (Brevo), fall back to SENDGRID_API_KEY for compatibility
const API_KEY = process.env.SENDINBLUE_API_KEY || process.env.SENDGRID_API_KEY;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'nayer.nfa@gmail.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'nayer.nfa@gmail.com';

// Initialize Brevo Client
let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = API_KEY;
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Map a field key to one of the major sections.
 */
// `fieldSection` helper previously existed here but was unused; removed to avoid unused symbol warnings.

// --- Field Mapping for Cleaner PDF Labels ---
const FIELD_MAP = {
  FullName: 'Full Name (Arabic)',
  FirstName_Arabic: 'First Name (Arabic)',
  LastName_Arabic: 'Last Name (Arabic)',
  DOB_Day: 'Date of Birth (Day)',
  DOB_Month: 'Date of Birth (Month)',
  DOB_Year: 'Date of Birth (Year)',
  Nationality: 'Current Nationality',
  PassportType: 'Passport Type',
  PassportNumber: 'Passport Number',
  IssueDate_Day: 'Passport Issue Date (Day)',
  IssueDate_Month: 'Passport Issue Date (Month)',
  IssueDate_Year: 'Passport Issue Date (Year)',

  // Example for Conditional Fields
  Other_Nationality: 'Other Nationality (If Applicable)',
  Other_PassportNumber: 'Second Passport Number',
  // Lost / Stolen Passport fields
  LostPassport: 'Lost Passport - Ever Lost or Stolen',
  LostPassport_PassportNumber: 'Passport/Travel Document Number (Lost/Stolen)',
  LostPassport_DoNotKnow: 'Lost Passport - Do Not Know',
  LostPassport_Country: 'Country/Authority that Issued Passport/Travel Document',
  LostPassport_Explain: 'Lost Passport - Explanation',
  Spouse_DOB_Day: 'Spouse Date of Birth (Day)',
  Spouse_DOB_Month: 'Spouse Date of Birth (Month)',
  Spouse_DOB_Year: 'Spouse Date of Birth (Year)',

  // Add more mappings here for cleaner output...
  Education_InstitutionName_2: 'Education Institution (2)',
  Education_Address_2: 'Education Address (2)',
  Education_QualificationName_2: 'Qualification Name (2)',
  Education_QualificationMajor_2: 'Qualification Major (2)',
  Education_StudyStartDate_Day_2: 'Study Start Day (2)',
  Education_StudyStartDate_Month_2: 'Study Start Month (2)',
  Education_StudyStartDate_Year_2: 'Study Start Year (2)',
  Education_StudyEndDate_Day_2: 'Study End Day (2)',
  Education_StudyEndDate_Month_2: 'Study End Month (2)',
  Education_StudyEndDate_Year_2: 'Study End Year (2)',
  Military_Served: 'Served in Military',
  Military_Branch: 'Branch of Service (فرع الخدمة)',
  Military_Rank: 'Rank/Position (الرتبة)',
  Military_Specialty: 'Military Specialty (السلاح)',
  Military_ServiceFrom_Day: 'Military Service From Day',
  Military_ServiceFrom_Month: 'Military Service From Month',
  Military_ServiceFrom_Year: 'Military Service From Year',
  Military_ServiceTo_Day: 'Military Service To Day',
  Military_ServiceTo_Month: 'Military Service To Month',
  Military_ServiceTo_Year: 'Military Service To Year',
};
// --- End Field Mapping ---

/**
 * Generates a DOCX buffer from form data and groups fields under section headings.
 * @param {object} formData
 * @returns {Promise<Buffer>} The DOCX content as a buffer.
 */
async function generateDocument(formData, opts = {}) {
  // pdfmake uses document definition objects for layout
  // Build a table body for key/value rows
  // Initialize reshaper to handle Arabic text shaping
  const ReshaperExport = ReshaperModule.default || ReshaperModule.ArabicReshaper || ReshaperModule;
  let reshaper;
  try {
    if (typeof ReshaperExport === 'function') {
      try {
        const instance = new ReshaperExport();
        if (instance && typeof instance.convertArabic === 'function') {
          reshaper = { reshape: instance.convertArabic.bind(instance) };
        } else if (instance && typeof instance.reshape === 'function') {
          reshaper = instance;
        } else {
          reshaper = { reshape: (t) => t };
        }
      } catch (instErr) {
        const value = ReshaperExport();
        if (value && typeof value.convertArabic === 'function')
          reshaper = { reshape: value.convertArabic.bind(value) };
        else if (value && typeof value.reshape === 'function') reshaper = value;
        else reshaper = { reshape: (t) => t };
      }
    } else if (ReshaperExport && typeof ReshaperExport.convertArabic === 'function') {
      reshaper = { reshape: ReshaperExport.convertArabic.bind(ReshaperExport) };
    } else {
      reshaper = { reshape: (text) => text };
    }
  } catch (e) {
    reshaper = { reshape: (text) => text };
  }

  // Process and reshape values
  const processedData = {};
  const containsArabic = (s) => /[\u0600-\u06FF]/.test(String(s || ''));
  for (const [key, rawValue] of Object.entries(formData || {})) {
    let value = rawValue === undefined || rawValue === null ? '' : String(rawValue);
    if (containsArabic(value) && reshaper && typeof reshaper.reshape === 'function') {
      try {
        const shaped = reshaper.reshape(value);
        value = shaped.split('').reverse().join('');
      } catch (er) {
        /* ignore */
      }
    }
    processedData[key] = value;
  }

  // Build a table-based layout instead of paragraph list for clearer two-column presentation
  const tableRows = [];

  // Header row (repeats on new pages)
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
      tableHeader: true,
    })
  );

  // Add data rows
  for (const [key, value] of Object.entries(processedData)) {
    if ((value || '').toString().trim() === '') continue;
    const displayKey = FIELD_MAP[key] || key;
    const isArabic = /[\u0600-\u06FF]/.test(value);

    tableRows.push(
      new TableRow({
        children: [
          // Questions column (LTR)
          new TableCell({
            width: { size: 3000, type: WidthType.DXA }, // Matching columnWidths: 3000
            children: [
              new Paragraph({
                children: [new TextRun({ text: displayKey, bold: true })],
                alignment: AlignmentType.LEFT,
              }),
            ],
          }),

          // Answers column (RTL when Arabic)
          new TableCell({
            width: { size: 7000, type: WidthType.DXA }, // Matching columnWidths: 7000
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: value,
                    rtl: isArabic,
                    font: { name: 'Arial' },
                  }),
                ],
                alignment: isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT,
                bidirectional: true,
              }),
            ],
          }),
        ],
      })
    );
  }

  // Create the table
  const dataTable = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3000, 7000],
  });

  // Title and date as separate paragraphs
  const titleParagraph = new Paragraph({
    children: [new TextRun({ text: 'DS-160 Submission Report', bold: true, size: 32 })],
    alignment: AlignmentType.CENTER,
  });
  const dateParagraph = new Paragraph({
    children: [new TextRun(`Date: ${new Date().toLocaleDateString()}`)],
    alignment: AlignmentType.LEFT,
  });

  // ----------------------------------------------------
  // 1. Read the Image File and Convert to Buffer
  // ----------------------------------------------------
  const imagePath = path.resolve(process.cwd(), 'assets', 'ds160_header.png');
  let imageBuffer;
  try {
    imageBuffer = fs.readFileSync(imagePath);
  } catch (e) {
    console.warn(`Warning: Could not load image from ${imagePath}. Skipping image addition.`, e);
    imageBuffer = null;
  }

  // ----------------------------------------------------
  // 2. Build Content (Sections Children Array)
  // ----------------------------------------------------
  const documentChildren = [];

  // Detect the image type (png/jpeg/svg) to pass to docx ImageRun
  function detectImageType(buf) {
    if (!buf || buf.length < 4) return 'png';
    // PNG header: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
    // JPEG header: FF D8
    if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
    // SVG detection (starts with '<svg' or '<?xml')
    const header = buf.toString('utf8', 0, 16).trim();
    if (header.startsWith('<svg') || header.startsWith('<?xml')) return 'svg';
    return 'png';
  }
  // Insert header image only when explicitly requested via opts.includeHeaderImage === true
  // (Default is NOT to embed an image in the generated DOCX)
  let headerObject = null;
  if (imageBuffer && opts.includeHeaderImage === true) {
    const imageType = detectImageType(imageBuffer);
    // Add the image as a header rather than in the body to avoid inline drawing complexity
    const headerParagraph = new Paragraph({
      children: [
        new ImageRun({
          data: imageBuffer,
          type: imageType,
          altText: 'DS-160 Header',
          transformation: { width: 500, height: 100 },
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    });
    try {
      const headerClass = docx.Header || docx.Headers || null;
      if (headerClass) {
        headerObject = new headerClass({ children: [headerParagraph] });
      } else {
        // Fallback: add image to document body if Header class is unavailable
        documentChildren.unshift(headerParagraph);
      }
    } catch (e) {
      // Fallback to body insertion if header creation fails
      documentChildren.unshift(headerParagraph);
    }
  }

  // Add the Title (if it was a separate paragraph)
  documentChildren.push(titleParagraph);
  documentChildren.push(dateParagraph);

  // Add the Table we created previously
  // (Ensure the dataTable object is defined from your previous code)
  documentChildren.push(dataTable);

  // 3. Assemble the Document
  const sectionConfig = { children: documentChildren };
  if (headerObject) sectionConfig.headers = { default: headerObject };

  const doc = new Document({
    sections: [sectionConfig],
  });

  const buffer = await Packer.toBuffer(doc);
  if (opts.returnProcessedData) return { buffer, processedData };
  return buffer;
}

const submitHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const body = req.body;

    // 1. Generate the DOCX
    const docBuffer = await generateDocument(body, { includeHeaderImage: false });

    // 2. Convert Buffer to Base64 String for Brevo Attachment
    const base64Docx = docBuffer.toString('base64');

    // 3. Construct Brevo Email
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = `DOCX ATTACHED: DS-160 Submission - ${body.FullName || 'Client'}`;

    // Brevo requires a text body even with attachments
    sendSmtpEmail.htmlContent = 'The detailed DS-160 survey submission is attached as a DOCX file.';

    sendSmtpEmail.sender = { name: 'DS-160 Form', email: SENDER_EMAIL };
    sendSmtpEmail.to = [{ email: RECIPIENT_EMAIL }];

    // 4. Add the DOCX Attachment - include filename and proper MIME type
    sendSmtpEmail.attachment = [
      {
        content: base64Docx,
        name: `DS-160_Submission_${Date.now()}.docx`, // keep for backward compatibility
        filename: `DS-160_Submission_${Date.now()}.docx`,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    ];

    // 5. Send the Email
    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('DOCX Attached & Email sent successfully via Brevo.');
    res
      .status(200)
      .json({ success: true, message: 'Form submitted and DOCX email sent successfully.' });
  } catch (error) {
    console.error('Brevo/DOCX Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process DOCX or send email. Check Vercel logs.',
    });
  }
};

// Expose the handler and generateDocument for testing
module.exports = submitHandler;
module.exports.generateDocument = generateDocument;
