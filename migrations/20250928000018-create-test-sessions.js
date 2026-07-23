'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('test_sessions', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      test_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tests',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_completed: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0
      },
      is_submitted: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0
      },
      remaining_time_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Remaining time in seconds for the test session'
      },
      current_question_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      session_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON field to store session-specific data like answered questions, time spent per question, etc.'
      },
      answers_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON field to store all answers for quick access'
      },
      calculated_score: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Final calculated score including negative marking'
      },
      total_correct: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_wrong: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_unanswered: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_marked_for_review: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'completed', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'active'
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
    await queryInterface.addIndex('test_sessions', ['user_id'], { name: 'test_sessions_user_id' });
    await queryInterface.addIndex('test_sessions', ['test_id'], { name: 'test_sessions_test_id' });
    await queryInterface.addIndex('test_sessions', ['user_id', 'test_id'], { name: 'test_sessions_user_id_test_id' });
    await queryInterface.addIndex('test_sessions', ['status'], { name: 'test_sessions_status' });
    await queryInterface.addIndex('test_sessions', ['is_completed'], { name: 'test_sessions_is_completed' });
    await queryInterface.addIndex('test_sessions', ['started_at'], { name: 'test_sessions_started_at' });
    await queryInterface.addIndex('test_sessions', ['completed_at'], { name: 'test_sessions_completed_at' });

    // Add unique constraint for active sessions
    await queryInterface.addIndex('test_sessions', ['user_id', 'test_id', 'status'], {
      name: 'unique_active_session_per_user_test',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('test_sessions');
  }
};