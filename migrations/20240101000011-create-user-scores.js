'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_score', {
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
      total_score: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      correct_answers: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      wrong_answers: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      unanswered: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      percentage: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      time_taken: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      is_passed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      attempt_number: {
        type: Sequelize.INTEGER,
        defaultValue: 1
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
    await queryInterface.addIndex('user_score', ['user_id']);
    await queryInterface.addIndex('user_score', ['test_id']);
    await queryInterface.addIndex('user_score', ['user_id', 'test_id']);
    await queryInterface.addIndex('user_score', ['percentage']);
    await queryInterface.addIndex('user_score', ['rank']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_score');
  }
};