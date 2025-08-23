'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('dynamic_questions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dynamic_categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the category that contains this question',
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      question_text_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Options
      option_a: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      option_a_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      option_b: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      option_b_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      option_c: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      option_c_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      option_d: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      option_d_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      correct_answer: {
        type: Sequelize.ENUM('A', 'B', 'C', 'D'),
        allowNull: false,
      },
      explanation: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      explanation_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      marks: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },
      difficulty_level: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        defaultValue: 'medium',
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Subject area for this question',
      },
      topic: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Specific topic within subject',
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('dynamic_questions', ['category_id']);
    await queryInterface.addIndex('dynamic_questions', ['difficulty_level']);
    await queryInterface.addIndex('dynamic_questions', ['subject']);
    await queryInterface.addIndex('dynamic_questions', ['display_order']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('dynamic_questions');
  },
};