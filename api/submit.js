// --- NEW CODE INCLUDING PDF GENERATION AND ATTACHMENT ---

const SibApiV3Sdk = require('sib-api-v3-sdk');
const fs = require('fs');
const path = require('path');
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

// Assign the fonts to pdfMake VFS (Virtual File System)
// Setup pdfMake VFS and add Arabic font from local Fonts folder
pdfMake.vfs = pdfFonts.pdfMake && pdfFonts.pdfMake.vfs ? pdfFonts.pdfMake.vfs : pdfFonts;
try {
    const arabicFontPath = path.join(__dirname, '..', 'Fonts', 'Amiri-Regular.ttf');
    if (fs.existsSync(arabicFontPath)) {
        const fontBase64 = fs.readFileSync(arabicFontPath).toString('base64');
        // Add custom Arabic font to the vfs under the file name
        pdfMake.vfs['Amiri-Regular.ttf'] = fontBase64;
    }
} catch (err) {
    console.warn('Unable to read / add Arabic font to pdfMake vfs:', err.message || err);
}

// Define a simple fonts map. If you add a custom Arabic font in the VFS,
// add it here (example: Amiri). For now, Roboto will be used as default.
pdfMake.fonts = {
    Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-Italic.ttf'
    },
    Amiri: {
        normal: 'Amiri-Regular.ttf',
        bold: 'Amiri-Regular.ttf'
    }
};

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

    // Add more mappings here for cleaner output...
};
// --- End Field Mapping ---

/**
 * Generates a PDF buffer from form data and groups fields under section headings.
 * @param {object} formData 
 * @returns {Promise<Buffer>} The PDF content as a buffer.
 */
async function generatePDF(formData) {
    // pdfmake uses document definition objects for layout
    const docDefinition = {
        // Critical: Set the global alignment for RTL languages
        defaultStyle: {
            font: 'Amiri', // Use the Arabic font by default to ensure correct shaping
            fontSize: 12,
            alignment: 'right', // Align all text to the right by default
        },
        content: [
            // Text objects automatically handle RTL when alignment is set to right
            { text: 'DS-160 Submission Report', fontSize: 18, margin: [0, 0, 0, 10] },
            { text: `Date: ${new Date().toLocaleString('en-US')}`, margin: [0, 0, 0, 20], alignment: 'left' },

            // Example of Arabic section title
            { text: 'المعلومات الشخصية', style: 'sectionTitle' },
            
            // Loop through form data (simplifying content for demonstration)
            ...Object.entries(formData).map(([key, value]) => {
                const displayKey = FIELD_MAP[key] || key; // Assuming FIELD_MAP is still available
                const displayValue = value === undefined || value === null ? '' : String(value);
                const isArabicVal = /[\u0600-\u06FF]/.test(displayValue);
                // Use columns for stable mixing of LTR and RTL
                return {
                    columns: [
                        { width: '*', text: displayKey + ':', bold: true, font: 'Roboto', alignment: 'left', direction: 'ltr' },
                        { width: 'auto', text: displayValue, font: isArabicVal ? 'Amiri' : 'Roboto', alignment: isArabicVal ? 'right' : 'left', direction: isArabicVal ? 'rtl' : 'ltr' }
                    ],
                    columnGap: 10,
                    margin: [0, 0, 0, 2]
                };
            })
        ],
        styles: {
            sectionTitle: {
                fontSize: 14,
                bold: true,
                color: 'red',
                alignment: 'right',
                margin: [0, 10, 0, 5]
            }
        }
    };

    // Use pdfmake to create the PDF Buffer
    return new Promise((resolve, reject) => {
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.getBuffer((buffer) => {
            if (buffer) {
                resolve(buffer);
            } else {
                reject(new Error("PDFMake failed to create buffer."));
            }
        });
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const body = req.body;
        
        // 1. Generate the PDF
        const pdfBuffer = await generatePDF(body);
        
        // 2. Convert Buffer to Base64 String for Brevo Attachment
        const base64Pdf = pdfBuffer.toString('base64');
        
        // 3. Construct Brevo Email
        let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = `PDF ATTACHED: DS-160 Submission - ${body.FullName || 'Client'}`;
        
        // Brevo requires a text body even with attachments
        sendSmtpEmail.htmlContent = 'The detailed DS-160 survey submission is attached as a PDF file.';
        
        sendSmtpEmail.sender = { "name": "DS-160 Form", "email": SENDER_EMAIL };
        sendSmtpEmail.to = [{ "email": RECIPIENT_EMAIL }];
        
        // 4. Add the PDF Attachment
        sendSmtpEmail.attachment = [{ 
            'content': base64Pdf,
            'name': `DS-160_Submission_${Date.now()}.pdf` 
        }];

        // 5. Send the Email
        await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log(`PDF Attached & Email sent successfully via Brevo.`);
        res.status(200).json({ success: true, message: 'Form submitted and PDF email sent successfully.' });

    } catch (error) {
        console.error('Brevo/PDF Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process PDF or send email. Check Vercel logs.' });
    }
};