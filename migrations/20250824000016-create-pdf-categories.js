'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pdf_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Category name (e.g., Study Materials, Previous Papers, etc.)'
      },
      slug: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'URL-friendly version of name'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      icon: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Icon name for category display'
      },
      color: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: '#3B82F6',
        comment: 'Hex color code for category'
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Display order for categories'
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
    await queryInterface.addIndex('pdf_categories', ['slug'], { name: 'pdf_categories_slug' });
    await queryInterface.addIndex('pdf_categories', ['is_active'], { name: 'pdf_categories_is_active' });
    await queryInterface.addIndex('pdf_categories', ['sort_order'], { name: 'pdf_categories_sort_order' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pdf_categories');
  }
};