const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create uploads directory if it doesn't exist
const createUploadsDir = () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const pdfsDir = path.join(uploadsDir, 'pdfs');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }
  
  return pdfsDir;
};

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pdfsDir = createUploadsDir();
    cb(null, pdfsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `pdf-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter to only allow PDFs
const fileFilter = (req, file, cb) => {
  console.log('File filter - mimetype:', file.mimetype);
  console.log('File filter - originalname:', file.originalname);
  
  // Check MIME type
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    // Check file extension as fallback
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware for single PDF upload
const uploadSinglePDF = upload.single('pdf');

// Middleware wrapper with error handling
const handlePDFUpload = (req, res, next) => {
  uploadSinglePDF(req, res, (err) => {
    if (err) {
      console.error('PDF upload error:', err);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 50MB.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Only one file allowed.'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Unexpected field in form data. Expected "pdf" field.'
          });
        }
      }
      
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    
    if (!req.file) {
      console.log('No file provided in request');
      return res.status(400).json({
        success: false,
        message: 'No PDF file provided'
      });
    }
    
    console.log('File successfully uploaded by multer:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
    
    next();
  });
};

// Utility function to delete a PDF file
const deletePDFFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting PDF file:', error);
  }
  return false;
};

// Utility function to get file info
const getFileInfo = (file) => {
  return {
    original_filename: file.originalname,
    file_path: file.path,
    file_size: file.size,
    mime_type: file.mimetype || 'application/pdf'
  };
};

// Utility function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Utility function to validate PDF file
const validatePDFFile = (filePath) => {
  try {
    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      console.error('PDF validation - file does not exist:', filePath);
      return false;
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    console.log('PDF validation - file size:', stats.size, 'bytes');
    
    if (stats.size === 0) {
      console.error('PDF validation - file is empty');
      return false;
    }

    // Read first 5 bytes to check PDF signature '%PDF-'
    const buffer = fs.readFileSync(filePath, { start: 0, end: Math.min(5, stats.size) });
    const signature = buffer.toString('ascii', 0, Math.min(4, buffer.length));
    console.log('PDF validation - signature:', JSON.stringify(signature), 'from file:', filePath);
    
    // Check for PDF signature
    const isValid = signature === '%PDF';
    console.log('PDF validation result:', isValid);
    return isValid;
  } catch (error) {
    console.error('PDF validation error:', error);
    return false;
  }
};

module.exports = {
  handlePDFUpload,
  deletePDFFile,
  getFileInfo,
  formatFileSize,
  validatePDFFile,
  createUploadsDir
};