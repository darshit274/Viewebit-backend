'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('question_reports', {
      // Primary Key
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        allowNull: false
      },

      // Foreign Keys
      question_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'questions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'References questions.id'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who submitted the report'
      },

      // Report Data
      report_type: {
        type: Sequelize.ENUM('wrong_question', 'wrong_solution', 'other'),
        allowNull: false,
        comment: 'Type of issue reported'
      },
      report_text: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User description for "other" type or additional details'
      },
      user_selected_answer: {
        type: Sequelize.STRING(1),
        allowNull: true,
        comment: 'A, B, C, or D - what user answered'
      },

      // Status Management
      status: {
        type: Sequelize.ENUM('pending', 'under_review', 'resolved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Current status of the report'
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal notes visible only to admins'
      },
      reviewed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin user ID who reviewed this report'
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the report was reviewed'
      },

      // Audit Trail
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When report was submitted'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        comment: 'Last update timestamp'
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Stores user-submitted reports for question issues'
    });

    // Add Indexes for Performance
    await queryInterface.addIndex('question_reports', ['question_id', 'status'], {
      name: 'idx_question_status',
      comment: 'Fast lookup of reports per question by status'
    });

    await queryInterface.addIndex('question_reports', ['status', 'created_at'], {
      name: 'idx_status_created',
      comment: 'Fast sorting by status and date'
    });

    await queryInterface.addIndex('question_reports', ['user_id'], {
      name: 'idx_user_id',
      comment: 'User report history lookup'
    });

    await queryInterface.addIndex('question_reports', ['created_at'], {
      name: 'idx_created_at',
      comment: 'Recent reports first'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('question_reports', 'idx_question_status');
    await queryInterface.removeIndex('question_reports', 'idx_status_created');
    await queryInterface.removeIndex('question_reports', 'idx_user_id');
    await queryInterface.removeIndex('question_reports', 'idx_created_at');

    // Drop table
    await queryInterface.dropTable('question_reports');
  }
};
