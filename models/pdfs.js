'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Pdfs extends Model {
    static associate(models) {
      // Category relationship
      Pdfs.belongsTo(models.PdfCategory, {
        foreignKey: 'category_id',
        as: 'category'
      });
      
      // Test series relationship
      if (models.TestSeries) {
        Pdfs.belongsTo(models.TestSeries, {
          foreignKey: 'test_series_id',
          as: 'testSeries'
        });
      }
      
      // Exam type relationship
      Pdfs.belongsTo(models.ExamType, {
        foreignKey: 'exam_type_id',
        as: 'examType'
      });
      
      // Admin relationship
      Pdfs.belongsTo(models.Admin, {
        foreignKey: 'uploaded_by',
        as: 'uploader'
      });
      
      // Test relationship - commented out until Test model is properly implemented
      // Pdfs.belongsTo(models.Test, {
      //   foreignKey: 'test_id',
      //   as: 'test'
      // });
    }
  }
  
  Pdfs.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Display title for the PDF'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Category relationship (nullable for course-based PDFs)
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'pdf_categories',
        key: 'id'
      }
    },
    
    // File information
    file_path: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Server path to the PDF file'
    },
    original_filename: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Original filename when uploaded'
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'File size in bytes'
    },
    mime_type: {
      type: DataTypes.STRING,
      defaultValue: 'application/pdf',
      comment: 'MIME type of the file'
    },
    
    // Access control
    access_level: {
      type: DataTypes.ENUM('free', 'premium', 'restricted'),
      defaultValue: 'free',
      comment: 'Who can access this PDF'
    },
    
    // Test series linking (optional)
    test_series_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'test_series',
        key: 'id'
      }
    },
    
    // Subject/exam linking
    exam_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'exam_types',
        key: 'id'
      }
    },
    
    // Metadata
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of tags for better search'
    },
    download_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times downloaded'
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times viewed'
    },
    
    // Pricing
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Price for premium PDFs'
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'INR',
      allowNull: false,
      comment: 'Currency for pricing'
    },
    is_free: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether the PDF is free to access'
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Discount percentage if any'
    },
    subscription_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether subscription is required to access'
    },
    preview_pages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of preview pages available for free'
    },

    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Position within a leaf (pdf_holder) category — lower number shown first
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Sibling order within the same category (lower = shown first)'
    },
    
    // Test relationship (optional) - disabled for now
    // test_id: {
    //   type: DataTypes.UUID,
    //   allowNull: true
    //   // references will be added when Test model is properly implemented
    // },
    
    // Admin information
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'admins',
        key: 'id'
      }
    },
    
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Pdfs',
    tableName: 'pdfs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Pdfs;
};