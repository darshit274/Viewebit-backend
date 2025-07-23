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
      Pdfs.belongsTo(models.Test_Series, {
        foreignKey: 'test_series_id',
        as: 'testSeries'
      });
      
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
    
    // Category relationship
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    
    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    // Test relationship (optional)
    test_id: {
      type: DataTypes.UUID,
      allowNull: true
      // references will be added when Test model is properly implemented
    },
    
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