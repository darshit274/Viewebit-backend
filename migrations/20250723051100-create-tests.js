'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('test', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      test_series_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'test_series',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_free: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_one_time_test: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60
      },
      negative_marking: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      negative_marks: {
        type: Sequelize.DOUBLE,
        defaultValue: 0.25
      },
      pass_marks: {
        type: Sequelize.INTEGER,
        defaultValue: 40
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      total_marks: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.addIndex('test', ['test_series_id']);
    await queryInterface.addIndex('test', ['is_free']);
    await queryInterface.addIndex('test', ['is_active']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('test');
  }
};