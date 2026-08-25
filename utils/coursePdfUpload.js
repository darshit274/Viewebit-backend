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
        cb(null, `pdf-${unique}${path.extname(file.originalname)}`);
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
