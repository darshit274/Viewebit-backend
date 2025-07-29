'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tests', {
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
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      title_gujarati: {
        type: Sequelize.STRING(400),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      description_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Association
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'test_series',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Test configuration
      test_type: {
        type: Sequelize.ENUM('practice', 'mock', 'assessment', 'sample', 'full_length'),
        defaultValue: 'practice'
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      total_questions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_marks: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      passing_marks: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      
      // Access control
      is_free: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Can be accessed without subscription'
      },
      is_one_time: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Can only be attempted once'
      },
      allows_pause: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        comment: 'Override series-level max attempts'
      },
      
      // Marking scheme
      has_negative_marking: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      negative_marks: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0
      },
      marks_per_question: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      
      // Scheduling
      available_from: {
        type: Sequelize.DATE,
        allowNull: true
      },
      available_until: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Features
      show_results_immediately: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      show_correct_answers: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      show_explanations: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      supports_multilanguage: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      
      // Instructions
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      instructions_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Status and ordering
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      
      // Analytics (updated via triggers/jobs)
      total_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      average_score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      average_time: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Average completion time in seconds'
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
    await queryInterface.addIndex('tests', ['uuid']);
    await queryInterface.addIndex('tests', ['test_series_id']);
    await queryInterface.addIndex('tests', ['test_type']);
    await queryInterface.addIndex('tests', ['is_free']);
    await queryInterface.addIndex('tests', ['is_active']);
    await queryInterface.addIndex('tests', ['display_order']);
    await queryInterface.addIndex('tests', ['available_from', 'available_until']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tests');
  }
};