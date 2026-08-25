// utils/lessonMediaUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES } = require('./uploadConfig');

const uploadDir = path.join(__dirname, '../uploads/lesson_media');

// Fixed mimetype -> stored-extension allowlist. The stored filename's
// extension must NEVER come from the client-supplied originalname (that's
// attacker-controlled and would let a spoofed Content-Type + malicious
// filename get served back with the wrong content-type by express.static).
const MIME_TO_EXTENSION = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/webm': '.webm',
    'audio/aac': '.aac'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        // Safe because fileFilter already rejected anything not in MIME_TO_EXTENSION.
        const ext = MIME_TO_EXTENSION[file.mimetype];
        cb(null, `media-${unique}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (
        (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) &&
        MIME_TO_EXTENSION[file.mimetype]
    ) {
        return cb(null, true);
    }
    cb(new Error('Only video or audio files are allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: Math.max(VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES), files: 1 }
});

module.exports = { lessonMediaUploadMiddleware: upload.single('file'), VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES };
