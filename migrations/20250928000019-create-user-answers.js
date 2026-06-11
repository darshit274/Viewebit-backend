'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      time_spent: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Time spent on this question in seconds'
      },
      is_flagged: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      is_visited: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
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

    // Add indexes
    await queryInterface.addIndex('user_answers', ['test_session_id'], { name: 'user_answers_test_session_id' });
    await queryInterface.addIndex('user_answers', ['question_id'], { name: 'user_answers_question_id' });

    // Add unique constraint
    await queryInterface.addIndex('user_answers', ['test_session_id', 'question_id'], {
      name: 'unique_session_question',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_answers');
  }
};