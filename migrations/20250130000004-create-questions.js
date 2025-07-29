'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('questions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        allowNull: false
      },
      
      // Association
      test_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tests',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Question content (English - primary)
      question: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      options: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'JSON array of options: [{"key": "A", "text": "Option A"}, ...]'
      },
      correct_option: {
        type: Sequelize.STRING(1),
        allowNull: false,
        comment: 'A, B, C, or D'
      },
      explanation: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Question content (Gujarati)
      question_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      options_gujarati: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON array of options in Gujarati'
      },
      explanation_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Question metadata
      subject: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      topic: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      sub_topic: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      difficulty: {
        type: Sequelize.ENUM('easy', 'medium', 'hard', 'expert'),
        defaultValue: 'medium'
      },
      
      // Marking
      marks: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      negative_marks: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0
      },
      
      // Media support
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      audio_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      
      // Question behavior
      time_limit: {
        type: Sequelize.INTEGER,
        comment: 'Time limit in seconds (optional)'
      },
      is_mandatory: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Must be answered to proceed'
      },
      
      // Display and ordering
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      
      // Analytics (updated via triggers/jobs)
      total_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      correct_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      average_time: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Average time spent in seconds'
      },
      
      // Admin tracking
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for efficient queries
    await queryInterface.addIndex('questions', ['uuid']);
    await queryInterface.addIndex('questions', ['test_id']);
    await queryInterface.addIndex('questions', ['subject']);
    await queryInterface.addIndex('questions', ['topic']);
    await queryInterface.addIndex('questions', ['difficulty']);
    await queryInterface.addIndex('questions', ['is_active']);
    await queryInterface.addIndex('questions', ['display_order']);
    await queryInterface.addIndex('questions', ['created_by']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('questions');
  }
};