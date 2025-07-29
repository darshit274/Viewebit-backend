'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_answers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      
      // Associations
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'questions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
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
      session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'test_sessions',
          key: 'session_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Answer data
      selected_option: {
        type: Sequelize.STRING(1),
        allowNull: true,
        comment: 'A, B, C, D or NULL for unanswered'
      },
      is_correct: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_flagged: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      
      // Timing and behavior
      time_taken: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Time spent on this question in seconds'
      },
      first_visit_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_visit_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      visit_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times question was visited'
      },
      
      // Scoring
      marks_obtained: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      marks_possible: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 1
      },
      
      // User behavior tracking
      option_changes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times user changed their answer'
      },
      confidence_level: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: true,
        comment: 'User-indicated confidence (if feature enabled)'
      },
      
      // Language and display
      language_used: {
        type: Sequelize.STRING(10),
        defaultValue: 'en'
      },
      
      // Additional metadata
      answer_sequence: {
        type: Sequelize.JSON,
        comment: 'Array tracking sequence of option selections with timestamps'
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
    await queryInterface.addIndex('user_answers', ['user_id']);
    await queryInterface.addIndex('user_answers', ['question_id']);
    await queryInterface.addIndex('user_answers', ['test_id']);
    await queryInterface.addIndex('user_answers', ['session_id']);
    await queryInterface.addIndex('user_answers', ['user_id', 'test_id']);
    await queryInterface.addIndex('user_answers', ['user_id', 'question_id']);
    await queryInterface.addIndex('user_answers', ['session_id', 'question_id']);
    await queryInterface.addIndex('user_answers', ['is_correct']);
    await queryInterface.addIndex('user_answers', ['is_flagged']);
    
    // Composite unique index to prevent duplicate answers per session/question
    await queryInterface.addIndex('user_answers', ['session_id', 'question_id'], {
      unique: true,
      name: 'unique_session_question'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_answers');
  }
};