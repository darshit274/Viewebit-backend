const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const renderTemplate = (template, replacements) => {
    return Object.entries(replacements).reduce(
        (text, [key, value]) => text.split(`{{${key}}}`).join(value),
        template
    );
};

// Generates a certificate PDF using pdfkit (pure JS — avoids the
// headless-Chromium packaging/cold-start problems puppeteer would introduce
// on this backend's serverless deployment target). Returns the absolute
// filesystem path and the public URL of the generated file.
async function generateCertificatePdf({ certificate, template, studentName, courseName }) {
    const uploadDir = path.join(__dirname, '../uploads/certificates');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `certificate_${certificate.uuid}.pdf`;
    const filePath = path.join(uploadDir, filename);

    const issueDate = new Date(certificate.issued_at || Date.now()).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const titleText = template?.title_text || 'Certificate of Completion';
    const bodyTemplate = template?.body_text_template
        || 'This certifies that {{studentName}} has successfully completed the course {{courseName}} on {{issueDate}}.';
    const bodyText = renderTemplate(bodyTemplate, { studentName, courseName, issueDate });

    await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
            .lineWidth(3)
            .strokeColor('#7C3AED')
            .stroke();

        doc.fontSize(30)
            .fillColor('#1F2937')
            .font('Helvetica-Bold')
            .text(titleText, 0, 120, { align: 'center' });

        doc.moveDown(2);
        doc.fontSize(16)
            .fillColor('#374151')
            .font('Helvetica')
            .text(bodyText, 100, 220, { align: 'center', width: doc.page.width - 200 });

        doc.fontSize(11)
            .fillColor('#6B7280')
            .text(`Certificate No: ${certificate.certificate_number}`, 0, doc.page.height - 100, { align: 'center' });
        doc.text(`Verify at: /certificates/verify/${certificate.verification_code}`, 0, doc.page.height - 80, { align: 'center' });

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
    });

    const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
    return {
        filePath,
        pdfUrl: `${serverUrl}/uploads/certificates/${filename}`
    };
}

module.exports = { generateCertificatePdf };
