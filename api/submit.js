// --- NEW CODE INCLUDING PDF GENERATION AND ATTACHMENT ---

const SibApiV3Sdk = require('sib-api-v3-sdk');
const fs = require('fs');
const path = require('path');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } = docx;
// Import Reshaper to ensure Arabic shaping works for Word output
const ReshaperModule = require('arabic-reshaper');

// We use `arabic-reshaper` to ensure Arabic text is shaped correctly for Word
// Docx will handle font embedding at client side or server if fonts are available.

// (Removed local TTF font path - we're using the VFS fonts via pdfmake)

// Configuration (using existing environment variables)
const API_KEY = process.env.SENDGRID_API_KEY; 
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
function fieldSection(key) {
    const k = key.toLowerCase();
    if (/name|dob|birth|nationality|marital|passport|placeofbirth|place/i.test(k) || k === 'fullname') return 'Personal Information (المعلومات الشخصية)';
    if (/email|phone|address|city|state|zip|postal|contact|telephone/i.test(k)) return 'Contact Information (معلومات التواصل)';
    if (/companion|travelcompanion|accompany/i.test(k)) return 'Travel Companions (مرافقو السفر)';
    if (/visa|us|previousus|traveltoamerica|previousvisa|usvisit/i.test(k)) return 'US History (سجل السفر إلى أمريكا)';
    if (/spouse|father|mother|family|relative|children|زوج|زوجة|ابن|ابنة/i.test(k)) return 'Family Data (البيانات العائلية)';
    if (/current|employer|company|jobtitle|position|workplace/i.test(k)) return 'Current Employment (الوظيفة الحالية)';
    if (/prev|previous|previousemployment|prevjob|الوظيفة السابقة/i.test(k)) return 'Previous Employment (الوظائف السابقة)';
    if (/education|degree|school|university|qualification|college|collegelevel/i.test(k)) return 'Education History (المؤهلات العلمية)';
    if (/travel|trip|visited|countries|travelhistory/i.test(k)) return 'Travel History (تاريخ السفر)';
    return 'Other';
}

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
    Spouse_DOB_Day: 'Spouse Date of Birth (Day)',
    Spouse_DOB_Month: 'Spouse Date of Birth (Month)',
    Spouse_DOB_Year: 'Spouse Date of Birth (Year)',
    // Secondary Education fields (additional degree 2)
    'degree-2': 'المؤهل العلمي (2)',
    'institution-2': 'اسم المؤسسة التعليمية (2)',
    'study-start-2': 'تاريخ بدء الدراسة (2)',
    'Education_InstitutionName_2': 'اسم المؤسسة التعليمية (2)',
    'Education_Address_2': 'عنوانها (2)',
    'Education_QualificationName_2': 'اسم المؤهل (2)',
    'Education_QualificationMajor_2': 'شعبة المؤهل (2)',
    'Education_StudyStartDate_2_Day': 'تاريخ بدء الدراسة (يوم) (2)',
    'Education_StudyStartDate_2_Month': 'تاريخ بدء الدراسة (شهر) (2)',
    'Education_StudyStartDate_2_Year': 'تاريخ بدء الدراسة (سنة) (2)',
    'Education_StudyEndDate_2_Day': 'تاريخ نهاية الدراسة (يوم) (2)',
    'Education_StudyEndDate_2_Month': 'تاريخ نهاية الدراسة (شهر) (2)',
    'Education_StudyEndDate_2_Year': 'تاريخ نهاية الدراسة (سنة) (2)',

    // Add more mappings here for cleaner output...
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
                if (value && typeof value.convertArabic === 'function') reshaper = { reshape: value.convertArabic.bind(value) };
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
            } catch (er) { /* ignore */ }
        }
        processedData[key] = value;
    }

    // Extract and set aside any second-degree education fields so they can be added
    // to the DOCX report explicitly (and prevent duplication in the auto-added table rows)
    // Consolidate second-education fields from multiple possible naming patterns
    const educationData2 = {
        degree: processedData['Education_QualificationName_2'] || processedData['degree-2'] || '',
        institution: processedData['Education_InstitutionName_2'] || processedData['institution-2'] || '',
        address: processedData['Education_Address_2'] || processedData['institutionAddress-2'] || '',
        major: processedData['Education_QualificationMajor_2'] || processedData['qualificationMajor-2'] || '',
        studyStartDay: processedData['Education_StudyStartDate_2_Day'] || '',
        studyStartMonth: processedData['Education_StudyStartDate_2_Month'] || '',
        studyStartYear: processedData['Education_StudyStartDate_2_Year'] || '',
        studyEndDay: processedData['Education_StudyEndDate_2_Day'] || '',
        studyEndMonth: processedData['Education_StudyEndDate_2_Month'] || '',
        studyEndYear: processedData['Education_StudyEndDate_2_Year'] || '',
        studyStart: processedData['study-start-2'] || '',
        studyEnd: processedData['study-end-2'] || '',
    };
    // Remove elements from processedData to avoid duplicate entries in the default loop
    delete processedData['Education_QualificationName_2'];
    delete processedData['degree-2'];
    delete processedData['Education_InstitutionName_2'];
    delete processedData['institution-2'];
    delete processedData['Education_Address_2'];
    delete processedData['institutionAddress-2'];
    delete processedData['Education_QualificationMajor_2'];
    delete processedData['qualificationMajor-2'];
    delete processedData['Education_StudyStartDate_2_Day'];
    delete processedData['Education_StudyStartDate_2_Month'];
    delete processedData['Education_StudyStartDate_2_Year'];
    delete processedData['Education_StudyEndDate_2_Day'];
    delete processedData['Education_StudyEndDate_2_Month'];
    delete processedData['Education_StudyEndDate_2_Year'];
    delete processedData['study-start-2'];
    delete processedData['study-end-2'];

    // Build a table-based layout instead of paragraph list for clearer two-column presentation
    const tableRows = [];

    // Header row (repeats on new pages)
    tableRows.push(new docx.TableRow({
        children: [
            new docx.TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Question', bold: true })], alignment: AlignmentType.CENTER })],
            }),
            new docx.TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Answer', bold: true })], alignment: AlignmentType.CENTER })],
            }),
        ],
        tableHeader: true,
    }));

    // Add data rows
    for (const [key, value] of Object.entries(processedData)) {
        if ((value || '').toString().trim() === '') continue;
        const displayKey = FIELD_MAP[key] || key;
        const isArabic = /[\u0600-\u06FF]/.test(value);

        tableRows.push(new docx.TableRow({
            children: [
                // Questions column (LTR)
                new docx.TableCell({
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: displayKey, bold: true })],
                            alignment: AlignmentType.LEFT,
                        }),
                    ],
                }),

                // Answers column (RTL when Arabic)
                new docx.TableCell({
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
        }));
    }

    // Append explicit rows for the second degree (if present)
    const anyEducation2Value = [
        educationData2.degree, educationData2.institution, educationData2.address, educationData2.major,
        educationData2.studyStartDay, educationData2.studyStartMonth, educationData2.studyStartYear,
        educationData2.studyStart, educationData2.studyEndDay, educationData2.studyEndMonth, educationData2.studyEndYear, educationData2.studyEnd
    ].some(v => (v || '').toString().trim() !== '');
    if (anyEducation2Value) {
        // Degree (2)
        tableRows.push(new docx.TableRow({
            children: [
                new docx.TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'المؤهل العلمي (2):', bold: true })], alignment: AlignmentType.LEFT })],
                }),
                new docx.TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: educationData2.degree, font: { name: 'Arial' } })], alignment: /[\u0600-\u06FF]/.test(educationData2.degree) ? AlignmentType.RIGHT : AlignmentType.LEFT, bidirectional: true })],
                }),
            ],
        }));

        // Institution (2)
        tableRows.push(new docx.TableRow({
            children: [
                new docx.TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'اسم المؤسسة التعليمية (2):', bold: true })], alignment: AlignmentType.LEFT })],
                }),
                new docx.TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: educationData2.institution, font: { name: 'Arial' } })], alignment: /[\u0600-\u06FF]/.test(educationData2.institution) ? AlignmentType.RIGHT : AlignmentType.LEFT, bidirectional: true })],
                }),
            ],
        }));

        // Compose start/end date strings (prefer day/month/year fields, otherwise use single-field fallback)
        function combineDateParts(day, month, year) {
            if ((day || '').toString().trim() === '' && (month || '').toString().trim() === '' && (year || '').toString().trim() === '') return '';
            return `${day || ''}/${month || ''}/${year || ''}`;
        }
        const startDateStr = combineDateParts(educationData2.studyStartDay, educationData2.studyStartMonth, educationData2.studyStartYear) || educationData2.studyStart || '';
        const endDateStr = combineDateParts(educationData2.studyEndDay, educationData2.studyEndMonth, educationData2.studyEndYear) || educationData2.studyEnd || '';

        // Address (2)
        if (educationData2.address && educationData2.address.toString().trim() !== '') {
            tableRows.push(new docx.TableRow({
                children: [
                    new docx.TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: 'عنوان المؤسسة (2):', bold: true })], alignment: AlignmentType.LEFT })],
                    }),
                    new docx.TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: educationData2.address, font: { name: 'Arial' } })], alignment: /[\u0600-\u06FF]/.test(educationData2.address) ? AlignmentType.RIGHT : AlignmentType.LEFT, bidirectional: true })],
                    }),
                ],
            }));
        }

        // Major (2)
        if (educationData2.major && educationData2.major.toString().trim() !== '') {
            tableRows.push(new docx.TableRow({
                children: [
                    new docx.TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: 'شعبة المؤهل (2):', bold: true })], alignment: AlignmentType.LEFT })],
                    }),
                    new docx.TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: educationData2.major, font: { name: 'Arial' } })], alignment: /[\u0600-\u06FF]/.test(educationData2.major) ? AlignmentType.RIGHT : AlignmentType.LEFT, bidirectional: true })],
                    }),
                ],
            }));
        }

        // Study Start (2)
        if (startDateStr && startDateStr.toString().trim() !== '') {
            tableRows.push(new docx.TableRow({
                children: [
                    new docx.TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: 'تاريخ بدء الدراسة (2):', bold: true })], alignment: AlignmentType.LEFT })],
                    }),
                    new docx.TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: startDateStr, font: { name: 'Arial' } })], alignment: /[\u0600-\u06FF]/.test(startDateStr) ? AlignmentType.RIGHT : AlignmentType.LEFT, bidirectional: true })],
                    }),
                ],
            }));
        }

        // Study End (2)
        if (endDateStr && endDateStr.toString().trim() !== '') {
            tableRows.push(new docx.TableRow({
                children: [
                    new docx.TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: 'تاريخ نهاية الدراسة (2):', bold: true })], alignment: AlignmentType.LEFT })],
                    }),
                    new docx.TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: endDateStr, font: { name: 'Arial' } })], alignment: /[\u0600-\u06FF]/.test(endDateStr) ? AlignmentType.RIGHT : AlignmentType.LEFT, bidirectional: true })],
                    }),
                ],
            }));
        }
    }

    // Create the table
    const dataTable = new docx.Table({
        rows: tableRows,
        width: { size: 100, type: docx.WidthType.PERCENTAGE },
        columnWidths: [3000, 7000],
    });

    // Title and date as separate paragraphs
    const titleParagraph = new Paragraph({ children: [new TextRun({ text: 'DS-160 Submission Report', bold: true, size: 32 })], alignment: AlignmentType.CENTER });
    const dateParagraph = new Paragraph({ children: [new TextRun(`Date: ${new Date().toLocaleDateString()}`)], alignment: AlignmentType.LEFT });

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
        if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
        // JPEG header: FF D8
        if (buf[0] === 0xFF && buf[1] === 0xD8) return 'jpeg';
        // SVG detection (starts with '<svg' or '<?xml')
        const header = buf.toString('utf8', 0, 16).trim();
        if (header.startsWith('<svg') || header.startsWith('<?xml')) return 'svg';
        return 'png';
    }
    // Insert header image only when includeHeaderImage is not explicitly false
    if (imageBuffer && opts.includeHeaderImage !== false) {
        const imageType = detectImageType(imageBuffer);
        // Add the image as the very first element
        documentChildren.push(
            new Paragraph({
                children: [
                    new ImageRun({
                        data: imageBuffer,
                        type: imageType,
                        altText: 'DS-160 Header',
                        transformation: {
                            width: 500,
                            height: 100,
                        },
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
            })
        );
    }

    // Add the Title (if it was a separate paragraph)
    documentChildren.push(titleParagraph);
    documentChildren.push(dateParagraph);
    
    // Add the Table we created previously
    // (Ensure the dataTable object is defined from your previous code)
    documentChildren.push(dataTable);


    // 3. Assemble the Document
    const doc = new Document({
        sections: [{
            children: documentChildren,
        }],
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
        
        sendSmtpEmail.sender = { "name": "DS-160 Form", "email": SENDER_EMAIL };
        sendSmtpEmail.to = [{ "email": RECIPIENT_EMAIL }];
        
        // 4. Add the DOCX Attachment - include filename and proper MIME type
        sendSmtpEmail.attachment = [{
            'content': base64Docx,
            'name': `DS-160_Submission_${Date.now()}.docx`, // keep for backward compatibility
            'filename': `DS-160_Submission_${Date.now()}.docx`,
            'contentType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }];

        // 5. Send the Email
        await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log(`DOCX Attached & Email sent successfully via Brevo.`);
        res.status(200).json({ success: true, message: 'Form submitted and DOCX email sent successfully.' });

    } catch (error) {
        console.error('Brevo/DOCX Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process DOCX or send email. Check Vercel logs.' });
    }
};

// Expose the handler and generateDocument for testing
module.exports = submitHandler;
module.exports.generateDocument = generateDocument;