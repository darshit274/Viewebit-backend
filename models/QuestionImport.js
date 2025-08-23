'use strict';

module.exports = (sequelize, DataTypes) => {
  const QuestionImport = sequelize.define('QuestionImport', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Stored filename on server'
    },
    original_filename: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Original filename provided by user'
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    file_type: {
      type: DataTypes.ENUM('excel', 'csv'),
      allowNull: false
    },
    total_rows: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total number of rows in the file (excluding header)'
    },
    successful_imports: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of questions successfully imported'
    },
    failed_imports: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of questions that failed to import'
    },
    import_status: {
      type: DataTypes.ENUM('uploaded', 'validating', 'validated', 'importing', 'completed', 'failed'),
      defaultValue: 'uploaded',
      allowNull: false
    },
    validation_errors: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of validation errors with row numbers'
    },
    import_errors: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of import errors with row numbers'
    },
    import_summary: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Summary of imported question IDs and statistics'
    }
  }, {
    tableName: 'question_imports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  QuestionImport.associate = function(models) {
    // Admin who performed the import
    QuestionImport.belongsTo(models.Admin, {
      foreignKey: 'admin_id',
      as: 'admin'
    });

    // Category where questions will be imported
    QuestionImport.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });

    // Test series (optional)
    QuestionImport.belongsTo(models.TestSeries, {
      foreignKey: 'test_series_id',
      as: 'testSeries'
    });
  };

  return QuestionImport;
};