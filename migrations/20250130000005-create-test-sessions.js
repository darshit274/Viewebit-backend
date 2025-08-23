'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('test_sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
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
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      is_submitted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      remaining_time_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      current_question_index: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      session_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      answers_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      calculated_score: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      total_correct: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      total_wrong: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      total_unanswered: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      total_marked_for_review: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'completed', 'expired', 'cancelled'),
        defaultValue: 'active',
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes with error handling
    try {
      await queryInterface.addIndex('test_sessions', ['user_id']);
    } catch (error) {
      console.log('Index test_sessions_user_id already exists, skipping...');
    }
    
    try {
      await queryInterface.addIndex('test_sessions', ['test_id']);
    } catch (error) {
      console.log('Index test_sessions_test_id already exists, skipping...');
    }
    
    try {
      await queryInterface.addIndex('test_sessions', ['status']);
    } catch (error) {
      console.log('Index test_sessions_status already exists, skipping...');
    }
    
    try {
      await queryInterface.addIndex('test_sessions', ['started_at']);
    } catch (error) {
      console.log('Index test_sessions_started_at already exists, skipping...');
    }
    
    try {
      await queryInterface.addIndex('test_sessions', ['completed_at']);
    } catch (error) {
      console.log('Index test_sessions_completed_at already exists, skipping...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('test_sessions');
  }
};