'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('dynamic_questions')) {
      return;
    }

    await queryInterface.createTable('dynamic_questions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'hierarchy_categories',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
        allowNull: false
      },
      option_c_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      option_d: {
        type: Sequelize.TEXT,
        allowNull: false
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
      marks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      difficulty_level: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium'
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: true
      },
      topic: {
        type: Sequelize.STRING,
        allowNull: true
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex('dynamic_questions', ['category_id'], { name: 'dynamic_questions_category_id' });
    await queryInterface.addIndex('dynamic_questions', ['is_active'], { name: 'dynamic_questions_is_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dynamic_questions');
  }
};
