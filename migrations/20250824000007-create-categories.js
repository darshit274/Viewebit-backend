'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('categories', {
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
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      name_gujarati: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Category name in Gujarati'
      },
      description_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Category description in Gujarati'
      },
      node_type: {
        type: Sequelize.ENUM('unset', 'container', 'question_holder'),
        allowNull: false,
        defaultValue: 'unset',
        comment: 'Type of node: unset (can become either), container (has subcategories), question_holder (has questions)'
      },
      parent_category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Parent category for hierarchical structure',
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      hierarchy_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Depth level in hierarchy (0 = root, 1 = subcategory, etc.)'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order for display within same parent'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
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
    await queryInterface.addIndex('categories', ['parent_category_id'], { name: 'idx_categories_parent' });
    await queryInterface.addIndex('categories', ['test_series_id', 'hierarchy_level'], { name: 'idx_categories_test_series_level' });
    await queryInterface.addIndex('categories', ['node_type'], { name: 'idx_categories_node_type' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('categories');
  }
};