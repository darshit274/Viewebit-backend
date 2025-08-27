'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if test_sessions table exists
    const tableExists = await queryInterface.tableExists('test_sessions');
    
    if (!tableExists) {
      await queryInterface.createTable('test_sessions', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
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
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_submitted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

      // Add indexes only if table was created
      try {
        await queryInterface.addIndex('test_sessions', ['user_id', 'test_id', 'status'], { 
          unique: true, 
          name: 'unique_active_session_per_user_test' 
        });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index unique_active_session_per_user_test already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['user_id'], { name: 'test_sessions_user_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_user_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['test_id'], { name: 'test_sessions_test_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_test_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['user_id', 'test_id'], { name: 'test_sessions_user_id_test_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_user_id_test_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['status'], { name: 'test_sessions_status' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_status already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['is_completed'], { name: 'test_sessions_is_completed' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_is_completed already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['started_at'], { name: 'test_sessions_started_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_started_at already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['completed_at'], { name: 'test_sessions_completed_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_completed_at already exists, skipping...');
      }
    } else {
      console.log('test_sessions table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('test_sessions', ['user_id', 'test_id', 'status'], { 
          unique: true, 
          name: 'unique_active_session_per_user_test' 
        });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index unique_active_session_per_user_test already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['user_id'], { name: 'test_sessions_user_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_user_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['test_id'], { name: 'test_sessions_test_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_test_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['user_id', 'test_id'], { name: 'test_sessions_user_id_test_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_user_id_test_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['status'], { name: 'test_sessions_status' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_status already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['is_completed'], { name: 'test_sessions_is_completed' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_is_completed already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['started_at'], { name: 'test_sessions_started_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_started_at already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('test_sessions', ['completed_at'], { name: 'test_sessions_completed_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index test_sessions_completed_at already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('test_sessions');
  }
};