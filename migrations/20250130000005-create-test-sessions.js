'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('test_sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      session_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        allowNull: false
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
      
      // Session metadata
      attempt_number: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      status: {
        type: Sequelize.ENUM('not_started', 'in_progress', 'paused', 'completed', 'timed_out', 'abandoned', 'terminated'),
        defaultValue: 'not_started'
      },
      
      // Time tracking
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_activity_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paused_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resumed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Duration tracking
      total_time_spent: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total active time in seconds'
      },
      pause_duration: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total pause time in seconds'
      },
      remaining_time: {
        type: Sequelize.INTEGER,
        comment: 'Remaining time in seconds'
      },
      pause_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times test was paused'
      },
      
      // Progress tracking
      current_question_id: {
        type: Sequelize.INTEGER,
        comment: 'Current/last viewed question'
      },
      current_question_index: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '0-based index of current question'
      },
      questions_visited: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      questions_answered: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      questions_flagged: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      
      // User preferences
      selected_language: {
        type: Sequelize.STRING(10),
        defaultValue: 'en'
      },
      font_size: {
        type: Sequelize.ENUM('small', 'medium', 'large'),
        defaultValue: 'medium'
      },
      
      // Results (populated after completion)
      total_score: {
        type: Sequelize.DECIMAL(8, 2),
        defaultValue: 0
      },
      max_possible_score: {
        type: Sequelize.DECIMAL(8, 2),
        defaultValue: 0
      },
      percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      correct_answers: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      wrong_answers: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      unanswered: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      negative_marks: {
        type: Sequelize.DECIMAL(8, 2),
        defaultValue: 0
      },
      
      // Performance metrics
      rank: {
        type: Sequelize.INTEGER,
        comment: 'Rank among all test takers'
      },
      percentile: {
        type: Sequelize.DECIMAL(5, 2),
        comment: 'Percentile score'
      },
      grade: {
        type: Sequelize.STRING(5),
        comment: 'Letter grade (A+, A, B+, etc.)'
      },
      is_passed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      
      // Security and tracking
      user_agent: {
        type: Sequelize.TEXT,
        comment: 'Browser/device information'
      },
      ip_address: {
        type: Sequelize.STRING(45), // Support both IPv4 and IPv6
        comment: 'IP address for security'
      },
      tab_switches: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times user switched tabs/windows'
      },
      fullscreen_exits: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times user exited fullscreen'
      },
      
      // Session state (JSON for complex data)
      session_data: {
        type: Sequelize.JSON,
        comment: 'Additional session state and metadata'
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
    await queryInterface.addIndex('test_sessions', ['session_id']);
    await queryInterface.addIndex('test_sessions', ['user_id']);
    await queryInterface.addIndex('test_sessions', ['test_id']);
    await queryInterface.addIndex('test_sessions', ['test_series_id']);
    await queryInterface.addIndex('test_sessions', ['status']);
    await queryInterface.addIndex('test_sessions', ['user_id', 'test_id']);
    await queryInterface.addIndex('test_sessions', ['started_at']);
    await queryInterface.addIndex('test_sessions', ['completed_at']);
    await queryInterface.addIndex('test_sessions', ['attempt_number']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('test_sessions');
  }
};