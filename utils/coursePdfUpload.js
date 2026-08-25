const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PDF_UPLOAD_MAX_SIZE_BYTES } = require('./uploadConfig');

const uploadDir = path.join(__dirname, '../uploads/pdfs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        // Stored extension is always `.pdf` — never derived from the
        // client-supplied originalname, which is attacker-controlled and
        // could otherwise be used to spoof the content-type express.static
        // serves the file back with (e.g. a `.html` filename + forged
        // `application/pdf` Content-Type, or a PDF/HTML polyglot).
        cb(null, `pdf-${unique}.pdf`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
        return cb(null, true);
    }
    cb(new Error('Only PDF files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: PDF_UPLOAD_MAX_SIZE_BYTES, files: 1 } });

module.exports = { coursePdfUploadMiddleware: upload.single('file') };
