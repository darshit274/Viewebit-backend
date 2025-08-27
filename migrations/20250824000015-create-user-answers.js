'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if user_answers table exists
    const tableExists = await queryInterface.tableExists('user_answers');
    
    if (!tableExists) {
      await queryInterface.createTable('user_answers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      test_session_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
        references: {
          model: 'test_sessions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'questions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      selected_option: {
        type: Sequelize.ENUM('A', 'B', 'C', 'D'),
        allowNull: true
      },
      is_correct: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      time_spent: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Time spent on this question in seconds'
      },
      is_flagged: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      is_visited: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
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

      // Add indexes only if table was created
      try {
        await queryInterface.addIndex('user_answers', ['test_session_id', 'question_id'], { 
          unique: true, 
          name: 'unique_session_question' 
        });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index unique_session_question already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('user_answers', ['test_session_id'], { name: 'user_answers_test_session_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index user_answers_test_session_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('user_answers', ['question_id'], { name: 'user_answers_question_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index user_answers_question_id already exists, skipping...');
      }
    } else {
      console.log('user_answers table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('user_answers', ['test_session_id', 'question_id'], { 
          unique: true, 
          name: 'unique_session_question' 
        });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index unique_session_question already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('user_answers', ['test_session_id'], { name: 'user_answers_test_session_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index user_answers_test_session_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('user_answers', ['question_id'], { name: 'user_answers_question_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index user_answers_question_id already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_answers');
  }
};