'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('test_series', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      exam_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      price: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      original_price: {
        type: Sequelize.DOUBLE,
        allowNull: true
      },
      total_tests: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      free_tests: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      duration_months: {
        type: Sequelize.INTEGER,
        defaultValue: 3
      },
      negative_marking: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      negative_marks: {
        type: Sequelize.DOUBLE,
        defaultValue: 0.25
      },
      pass_percentage: {
        type: Sequelize.INTEGER,
        defaultValue: 40
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    await queryInterface.addIndex('test_series', ['category']);
    await queryInterface.addIndex('test_series', ['exam_type']);
    await queryInterface.addIndex('test_series', ['is_active']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('test_series');
  }
};