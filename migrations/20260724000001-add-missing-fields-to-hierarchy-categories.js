'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('hierarchy_categories');

    const columns = {
      node_type: {
        type: Sequelize.ENUM('container', 'question_holder', 'unset'),
        allowNull: false,
        defaultValue: 'unset'
      },
      has_questions: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      has_subcategories: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      questions_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      subcategories_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_questions_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      total_marks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      difficulty_level: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium'
      },
      negative_marking_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      negative_marks_per_wrong: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.25
      },
      is_free_in_paid_series: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, this category quiz is free even if the parent test series is paid'
      }
    };

    for (const [name, definition] of Object.entries(columns)) {
      if (!table[name]) {
        await queryInterface.addColumn('hierarchy_categories', name, definition);
      }
    }
  },

  async down(queryInterface) {
    const columns = [
      'node_type', 'has_questions', 'has_subcategories', 'questions_count',
      'subcategories_count', 'total_questions_count', 'duration_minutes', 'total_marks',
      'difficulty_level', 'negative_marking_enabled', 'negative_marks_per_wrong',
      'is_free_in_paid_series'
    ];
    const table = await queryInterface.describeTable('hierarchy_categories');
    for (const name of columns) {
      if (table[name]) {
        await queryInterface.removeColumn('hierarchy_categories', name);
      }
    }
  }
};
