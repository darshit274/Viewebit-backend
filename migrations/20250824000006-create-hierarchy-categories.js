'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('hierarchy_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      name_gujarati: {
        type: Sequelize.STRING(400),
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
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'new_test_series',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'hierarchy_categories',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      hierarchy_level: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      hierarchy_path: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
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
      slug: {
        type: Sequelize.STRING(200),
        allowNull: true,
        unique: true
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      instructions_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      child_categories_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      tests_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      total_attempts: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      created_by: {
        type: Sequelize.STRING(255),
        allowNull: true
        // Note: Foreign key constraint removed to avoid data type conflicts
        // The relationship will be handled at application level
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('hierarchy_categories', ['test_series_id', 'hierarchy_level'], { name: 'hierarchy_categories_series_level_index' });
    await queryInterface.addIndex('hierarchy_categories', ['parent_id'], { name: 'hierarchy_categories_parent_index' });
    await queryInterface.addIndex('hierarchy_categories', ['hierarchy_path'], { name: 'hierarchy_categories_path_index' });
    await queryInterface.addIndex('hierarchy_categories', ['is_active'], { name: 'hierarchy_categories_active_index' });
    await queryInterface.addIndex('hierarchy_categories', ['display_order'], { name: 'hierarchy_categories_display_order_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('hierarchy_categories');
  }
};