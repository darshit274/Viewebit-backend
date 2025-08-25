'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('question_imports', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      admin_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
        references: {
          model: 'admins',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'new_test_series',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      file_type: {
        type: Sequelize.ENUM('excel', 'csv'),
        allowNull: false
      },
      total_rows: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      successful_imports: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      failed_imports: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      import_status: {
        type: Sequelize.ENUM('uploaded', 'validating', 'validated', 'importing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'uploaded'
      },
      validation_errors: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON array of validation errors with row numbers'
      },
      import_errors: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON array of import errors with row numbers'
      },
      import_summary: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Summary of imported question IDs and statistics'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('question_imports', ['admin_id'], { name: 'question_imports_admin_id' });
    await queryInterface.addIndex('question_imports', ['category_id'], { name: 'question_imports_category_id' });
    await queryInterface.addIndex('question_imports', ['test_series_id'], { name: 'test_series_id' });
    await queryInterface.addIndex('question_imports', ['import_status'], { name: 'question_imports_import_status' });
    await queryInterface.addIndex('question_imports', ['created_at'], { name: 'question_imports_created_at' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('question_imports');
  }
};