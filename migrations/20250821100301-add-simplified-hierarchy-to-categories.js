'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add simplified hierarchy fields to categories table
    await queryInterface.addColumn('categories', 'node_type', {
      type: Sequelize.ENUM('unset', 'container', 'question_holder'),
      defaultValue: 'unset',
      allowNull: false,
      comment: 'Type of node: unset (can become either), container (has subcategories), question_holder (has questions)'
    });

    await queryInterface.addColumn('categories', 'parent_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Parent category for hierarchical structure'
    });

    await queryInterface.addColumn('categories', 'hierarchy_level', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Depth level in hierarchy (0 = root, 1 = subcategory, etc.)'
    });

    await queryInterface.addColumn('categories', 'display_order', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Order for display within same parent'
    });

    // Add indexes for performance
    await queryInterface.addIndex('categories', ['parent_category_id'], {
      name: 'idx_categories_parent'
    });

    await queryInterface.addIndex('categories', ['test_series_id', 'hierarchy_level'], {
      name: 'idx_categories_test_series_level'
    });

    await queryInterface.addIndex('categories', ['node_type'], {
      name: 'idx_categories_node_type'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('categories', 'idx_categories_node_type');
    await queryInterface.removeIndex('categories', 'idx_categories_test_series_level');
    await queryInterface.removeIndex('categories', 'idx_categories_parent');

    // Remove columns
    await queryInterface.removeColumn('categories', 'display_order');
    await queryInterface.removeColumn('categories', 'hierarchy_level');
    await queryInterface.removeColumn('categories', 'parent_category_id');
    await queryInterface.removeColumn('categories', 'node_type');
  }
};
