'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exam_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      name_gujarati: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      description_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      hierarchy_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0=Root(Exam-wise), 1=Subject(Topic-wise), 2=Chapter(Chapter-wise)'
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'exam_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      hierarchy_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Materialized path for efficient queries: /1/5/12'
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      icon_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      color_code: {
        type: Sequelize.STRING(7),
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

    // Add indexes for efficient queries
    await queryInterface.addIndex('exam_categories', ['hierarchy_level']);
    await queryInterface.addIndex('exam_categories', ['parent_id']);
    await queryInterface.addIndex('exam_categories', ['hierarchy_path']);
    await queryInterface.addIndex('exam_categories', ['is_active']);
    await queryInterface.addIndex('exam_categories', ['display_order']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('exam_categories');
  }
};