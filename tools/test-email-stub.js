const JSZip = require('jszip');

const handler = require('./api/submit.js');

// Override injected send wrapper on exported handler to avoid network calls and inspect payload
handler._sendTransacEmail = async function (payload) {
  console.log('Stubbed _sendTransacEmail called. Inspecting payload...');
  if (!payload) return { ok: false };
  const att = payload.attachment && payload.attachment[0];
  if (!att) {
    console.log('No attachment present');
    return { ok: false };
  }
  console.log('attachment metadata:', {
    filename: att.filename || att.name,
    contentType: att.contentType,
  });
  const buf = Buffer.from(att.content, 'base64');
  const ok = buf[0] === 0x50 && buf[1] === 0x4b;
  console.log('Attachment is ZIP(DOCX) ok=', ok);
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml').async('string');
  console.log('docXml snippet:', docXml.substring(0, 200));
  const m = docXml.match(/[\u0600-\u06FF]/g);
  console.log('arabic chars found count:', m ? m.length : 0);
  return { ok: true };
};

const req = {
  method: 'POST',
  body: {
    FullName: 'محمد علي',
    FirstName_Arabic: 'محمد',
    LastName_Arabic: 'علي',
    ContactInformation: 'القاهرة',
  },
};
const res = { status: (s) => ({ json: (b) => console.log('RESPONSE', s, b) }) };

(async () => {
  try {
    await handler(req, res);
    console.log('handler finished');
  } catch (e) {
    console.error('handler error', e);
  }
})();
