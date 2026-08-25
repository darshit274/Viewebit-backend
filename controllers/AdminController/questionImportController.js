const { QuestionImport, Question, Category, Admin, TestSeries } = require('../../models');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ErrorHandler = require('../../utils/default/errorHandler');
const { TEMPLATE_HEADERS, buildSampleRows, parseAndValidateFile } = require('../../utils/questionImportParser');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/question_imports');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'questions-' + uniqueSuffix + extension);
  }
});

const fileFilter = function (req, file, cb) {
  // Check file type
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ErrorHandler('Only Excel (.xlsx, .xls) and CSV files are allowed', 400), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

class QuestionImportController {
  // Download template file
  async downloadTemplate(req, res, next) {
    try {
      const { format } = req.params; // 'excel' or 'csv'
      
      if (!['excel', 'csv'].includes(format)) {
        return next(new ErrorHandler('Invalid format. Use excel or csv', 400));
      }

      // Create sample data
      const sampleData = buildSampleRows();

      if (format === 'excel') {
        // Create Excel file
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sampleData);
        
        // Set column widths for better readability
        const colWidths = [
          { wch: 50 }, // Question Text (English)
          { wch: 50 }, // Question Text (Gujarati)
          { wch: 20 }, // Option A (English)
          { wch: 20 }, // Option B (English)
          { wch: 20 }, // Option C (English)
          { wch: 20 }, // Option D (English)
          { wch: 20 }, // Option A (Gujarati)
          { wch: 20 }, // Option B (Gujarati)
          { wch: 20 }, // Option C (Gujarati)
          { wch: 20 }, // Option D (Gujarati)
          { wch: 15 }, // Correct Answer
          { wch: 40 }, // Explanation (English)
          { wch: 40 }, // Explanation (Gujarati)
          { wch: 10 }  // Marks
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Questions');
        
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=question_import_template.xlsx');
        res.send(buffer);
        
      } else if (format === 'csv') {
        // Create CSV file
        const csvHeaders = Object.keys(sampleData[0]);
        const csvRows = sampleData.map(row => csvHeaders.map(header => `"${row[header]}"`).join(','));
        const csvContent = [csvHeaders.map(h => `"${h}"`).join(','), ...csvRows].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=question_import_template.csv');
        res.send(csvContent);
      }
      
    } catch (error) {
      console.error('Template download error:', error);
      next(new ErrorHandler('Failed to generate template', 500));
    }
  }

  // Upload and validate import file
  async uploadImportFile(req, res, next) {
    try {
      // Handle file upload
      upload.single('file')(req, res, async (uploadErr) => {
        if (uploadErr) {
          return next(uploadErr);
        }

        if (!req.file) {
          return next(new ErrorHandler('No file uploaded', 400));
        }

        const { category_id, test_series_id } = req.body;
        const adminId = req.admin?.id;

        if (!category_id) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          return next(new ErrorHandler('Category ID is required', 400));
        }

        // Verify category exists and can hold questions
        const category = await Category.findByPk(category_id);
        if (!category) {
          fs.unlinkSync(req.file.path);
          return next(new ErrorHandler('Category not found', 404));
        }

        // Check if category can hold questions (should be question_holder type)
        if (category.node_type !== 'question_holder' && category.node_type !== 'unset') {
          fs.unlinkSync(req.file.path);
          return next(new ErrorHandler('Selected category cannot contain questions directly', 400));
        }

        // Determine file type
        const fileType = req.file.mimetype.includes('csv') ? 'csv' : 'excel';

        // Create import record
        const importRecord = await QuestionImport.create({
          admin_id: adminId,
          category_id: category_id,
          test_series_id: test_series_id || null,
          filename: req.file.filename,
          original_filename: req.file.originalname,
          file_size: req.file.size,
          file_type: fileType,
          import_status: 'uploaded'
        });

        // Start validation in background
        this.validateImportFile(importRecord.id, req.file.path, fileType);

        res.json({
          success: true,
          data: {
            import_id: importRecord.id,
            status: 'uploaded',
            message: 'File uploaded successfully. Validation in progress...'
          }
        });
      });

    } catch (error) {
      console.error('Upload error:', error);
      next(new ErrorHandler('File upload failed', 500));
    }
  }

  // Validate uploaded file (runs in background)
  async validateImportFile(importId, filePath, fileType) {
    let importRecord;
    
    try {
      importRecord = await QuestionImport.findByPk(importId);
      if (!importRecord) return;

      // Update status to validating
      await importRecord.update({ import_status: 'validating' });

      const validationResult = await parseAndValidateFile(filePath, fileType);

      // Update import record with validation results
      await importRecord.update({
        import_status: validationResult.isValid ? 'validated' : 'failed',
        total_rows: validationResult.totalRows,
        validation_errors: validationResult.errors
      });

    } catch (error) {
      console.error('Validation error:', error);
      if (importRecord) {
        await importRecord.update({
          import_status: 'failed',
          validation_errors: [{ error: 'Validation process failed', details: error.message }]
        });
      }
    }
  }

  // Get import status
  async getImportStatus(req, res, next) {
    try {
      const { import_id } = req.params;
      
      const importRecord = await QuestionImport.findByPk(import_id, {
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name'] },
          { model: Admin, as: 'admin', attributes: ['id', 'name', 'email'] }
        ]
      });

      if (!importRecord) {
        return next(new ErrorHandler('Import record not found', 404));
      }

      res.json({
        success: true,
        data: importRecord
      });

    } catch (error) {
      console.error('Get import status error:', error);
      next(new ErrorHandler('Failed to get import status', 500));
    }
  }

  // Preview import data before final import
  async previewImport(req, res, next) {
    try {
      const { import_id } = req.params;
      
      const importRecord = await QuestionImport.findByPk(import_id);
      if (!importRecord) {
        return next(new ErrorHandler('Import record not found', 404));
      }

      if (importRecord.import_status !== 'validated') {
        return next(new ErrorHandler('Import must be validated before preview', 400));
      }

      // Re-parse file to get preview data
      const filePath = path.join(__dirname, '../../uploads/question_imports', importRecord.filename);
      const parseResult = await parseAndValidateFile(filePath, importRecord.file_type);

      // Return first 5 questions for preview
      const previewQuestions = parseResult.validQuestions.slice(0, 5);

      res.json({
        success: true,
        data: {
          total_valid_questions: parseResult.validQuestions.length,
          total_errors: parseResult.errors.length,
          preview_questions: previewQuestions,
          validation_errors: parseResult.errors.slice(0, 10) // Show first 10 errors
        }
      });

    } catch (error) {
      console.error('Preview import error:', error);
      next(new ErrorHandler('Failed to preview import', 500));
    }
  }

  // Confirm and execute import
  async confirmImport(req, res, next) {
    try {
      const { import_id } = req.params;
      
      const importRecord = await QuestionImport.findByPk(import_id);
      if (!importRecord) {
        return next(new ErrorHandler('Import record not found', 404));
      }

      if (importRecord.import_status !== 'validated') {
        return next(new ErrorHandler('Import must be validated before confirmation', 400));
      }

      // Update status to importing
      await importRecord.update({ import_status: 'importing' });

      // Execute import in background
      this.executeImport(import_id);

      res.json({
        success: true,
        data: {
          message: 'Import started. You will receive updates on the progress.',
          import_id: import_id
        }
      });

    } catch (error) {
      console.error('Confirm import error:', error);
      next(new ErrorHandler('Failed to start import', 500));
    }
  }

  // Execute actual import (runs in background)
  async executeImport(importId) {
    let importRecord;
    
    try {
      importRecord = await QuestionImport.findByPk(importId);
      if (!importRecord) return;

      const filePath = path.join(__dirname, '../../uploads/question_imports', importRecord.filename);
      const parseResult = await parseAndValidateFile(filePath, importRecord.file_type);

      let successCount = 0;
      let failCount = 0;
      const importErrors = [];
      const createdQuestions = [];

      // Import each valid question
      for (const questionData of parseResult.validQuestions) {
        try {
          const question = await Question.create({
            ...questionData,
            category_id: importRecord.category_id
          });
          
          createdQuestions.push(question.id);
          successCount++;
          
        } catch (error) {
          failCount++;
          importErrors.push({
            question: questionData.question_text.substring(0, 50) + '...',
            error: error.message
          });
        }
      }

      // Update import record with results
      await importRecord.update({
        import_status: 'completed',
        successful_imports: successCount,
        failed_imports: failCount,
        import_errors: importErrors,
        import_summary: {
          created_question_ids: createdQuestions,
          total_processed: parseResult.validQuestions.length,
          success_rate: ((successCount / parseResult.validQuestions.length) * 100).toFixed(2) + '%'
        }
      });

      // If questions were successfully imported, update category node_type to question_holder
      console.log(`🔍 DEBUG: Checking if need to update category node_type. successCount: ${successCount}, category_id: ${importRecord.category_id}`);
      if (successCount > 0) {
        const category = await Category.findByPk(importRecord.category_id);
        console.log(`🔍 DEBUG: Found category:`, {
          id: category?.id,
          name: category?.name,
          node_type: category?.node_type
        });
        if (category && category.node_type === 'unset') {
          console.log(`🔄 DEBUG: Updating category node_type from 'unset' to 'question_holder'`);
          await category.update({ node_type: 'question_holder' });
          console.log(`✅ Updated category "${category.name}" node_type to question_holder after importing ${successCount} questions`);
        } else {
          console.log(`ℹ️ DEBUG: Category node_type not updated. Current node_type: ${category?.node_type}`);
        }
      } else {
        console.log(`ℹ️ DEBUG: No questions imported (successCount: ${successCount}), skipping category node_type update`);
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

    } catch (error) {
      console.error('Execute import error:', error);
      if (importRecord) {
        await importRecord.update({
          import_status: 'failed',
          import_errors: [{ error: 'Import execution failed', details: error.message }]
        });
      }
    }
  }

  // Get import history
  async getImportHistory(req, res, next) {
    try {
      const { page = 1, limit = 10, category_id } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const whereClause = {};
      if (category_id) {
        whereClause.category_id = category_id;
      }

      const { count, rows: imports } = await QuestionImport.findAndCountAll({
        where: whereClause,
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name'] },
          { model: Admin, as: 'admin', attributes: ['id', 'name', 'email'] }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });

      res.json({
        success: true,
        data: imports,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('Get import history error:', error);
      next(new ErrorHandler('Failed to get import history', 500));
    }
  }
}

module.exports = new QuestionImportController();