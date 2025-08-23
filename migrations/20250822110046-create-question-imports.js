'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('question_imports', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      admin_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'admins',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'new_test_series',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false
      },
      original_filename: {
        type: Sequelize.STRING,
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
        defaultValue: 0
      },
      successful_imports: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      failed_imports: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      import_status: {
        type: Sequelize.ENUM('uploaded', 'validating', 'validated', 'importing', 'completed', 'failed'),
        defaultValue: 'uploaded',
        allowNull: false
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
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('question_imports', ['admin_id']);
    await queryInterface.addIndex('question_imports', ['category_id']);
    await queryInterface.addIndex('question_imports', ['import_status']);
    await queryInterface.addIndex('question_imports', ['created_at']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('question_imports');
  }
};
