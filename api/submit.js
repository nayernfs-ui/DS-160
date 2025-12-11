// --- NEW CODE INCLUDING PDF GENERATION AND ATTACHMENT ---

const SibApiV3Sdk = require('sib-api-v3-sdk');
const PDFDocument = require('pdfkit');
const getStream = require('get-stream'); // Helper to convert the PDF stream

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
 * Generates a PDF buffer from form data.
 * @param {object} formData 
 * @returns {Promise<Buffer>} The PDF content as a buffer.
 */
function generatePDF(formData) {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        
        // --- 🎨 PDF Layout Definition ---
        
        doc.fontSize(16).text('DS-160 Survey Submission Report', { underline: true }).moveDown(0.5);
        doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`).moveDown(1);
        
        doc.fontSize(14).text('Personal Information', { paragraphGap: 5, fill: 'blue' }).moveDown(0.5);
        
        // Simple iteration to display form fields
        for (const [key, value] of Object.entries(formData)) {
            if (key.startsWith('_')) continue;
            
            const displayKey = key.replace(/([A-Z])/g, ' $1').trim();
            const displayValue = Array.isArray(value) ? value.join(', ') : value;

            // Only display fields that have a value
            if (displayValue && displayValue.trim() !== '') {
                doc.fontSize(10).fillColor('black').text(`• ${displayKey}: `, { continued: true })
                    .fillColor('gray').text(displayValue);
            }
        }
        
        // --- 🎨 End Layout Definition ---
        
        doc.end();

        // Convert the PDF stream to a buffer
        try {
            const buffer = await getStream.buffer(doc);
            resolve(buffer);
        } catch (error) {
            reject(error);
        }
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