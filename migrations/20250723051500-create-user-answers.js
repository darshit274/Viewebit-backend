'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_answers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
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
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'test',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      question_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'questions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      selected_option: {
        type: Sequelize.ENUM('A', 'B', 'C', 'D'),
        allowNull: true
      },
      is_correct: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      time_taken: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      marks_obtained: {
        type: Sequelize.DOUBLE,
        defaultValue: 0
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

    // Add indexes
    await queryInterface.addIndex('user_answers', ['user_id']);
    await queryInterface.addIndex('user_answers', ['test_id']);
    await queryInterface.addIndex('user_answers', ['question_id']);
    await queryInterface.addIndex('user_answers', ['user_id', 'test_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_answers');
  }
};