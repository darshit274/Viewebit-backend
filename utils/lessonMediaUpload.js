// utils/lessonMediaUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES } = require('./uploadConfig');

const uploadDir = path.join(__dirname, '../uploads/lesson_media');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        cb(null, `media-${unique}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) return cb(null, true);
    cb(new Error('Only video or audio files are allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: Math.max(VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES), files: 1 }
});

module.exports = { lessonMediaUploadMiddleware: upload.single('file'), VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES };
