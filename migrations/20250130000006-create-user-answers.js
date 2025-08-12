'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_answers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      test_session_id: {
        type: Sequelize.UUID,
        allowNull: false,
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
        defaultValue: false
      },
      time_spent: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Time spent on this question in seconds'
      },
      is_flagged: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_visited: {
        type: Sequelize.BOOLEAN,
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

    // Add indexes for better performance
    await queryInterface.addIndex('user_answers', ['test_session_id']);
    await queryInterface.addIndex('user_answers', ['question_id']);
    await queryInterface.addIndex('user_answers', ['test_session_id', 'question_id'], {
      unique: true,
      name: 'unique_session_question'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_answers');
  }
};