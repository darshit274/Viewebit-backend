'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('questions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      question_text_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      option_a: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      option_a_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      option_b: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      option_b_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      option_c: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      option_c_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      option_d: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      option_d_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      correct_answer: {
        type: Sequelize.ENUM('A', 'B', 'C', 'D'),
        allowNull: false
      },
      explanation: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      explanation_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      difficulty: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        defaultValue: 'medium',
        allowNull: false
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: true
      },
      topic: {
        type: Sequelize.STRING,
        allowNull: true
      },
      marks: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      negative_marks: {
        type: Sequelize.DOUBLE,
        defaultValue: 0,
        allowNull: false
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
    await queryInterface.addIndex('questions', ['test_id']);
    await queryInterface.addIndex('questions', ['difficulty']);
    await queryInterface.addIndex('questions', ['subject']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('questions');
  }
};