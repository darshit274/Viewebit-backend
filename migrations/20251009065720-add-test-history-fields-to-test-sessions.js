'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('test_sessions', 'test_name', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Cached test name for test history'
    });

    await queryInterface.addColumn('test_sessions', 'category_name', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Cached category name for test history'
    });

    await queryInterface.addColumn('test_sessions', 'total_marks', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Total marks in the test'
    });

    await queryInterface.addColumn('test_sessions', 'obtained_marks', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Marks obtained before negative marking'
    });

    await queryInterface.addColumn('test_sessions', 'negative_marks', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Negative marks deducted'
    });

    await queryInterface.addColumn('test_sessions', 'attempted_questions', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of questions attempted by user'
    });

    await queryInterface.addColumn('test_sessions', 'accuracy', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Accuracy percentage (obtained/attempted * 100)'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('test_sessions', 'test_name');
    await queryInterface.removeColumn('test_sessions', 'category_name');
    await queryInterface.removeColumn('test_sessions', 'total_marks');
    await queryInterface.removeColumn('test_sessions', 'obtained_marks');
    await queryInterface.removeColumn('test_sessions', 'negative_marks');
    await queryInterface.removeColumn('test_sessions', 'attempted_questions');
    await queryInterface.removeColumn('test_sessions', 'accuracy');
  }
};
