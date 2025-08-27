'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if pdf_categories table exists
    const tableExists = await queryInterface.tableExists('pdf_categories');
    
    if (!tableExists) {
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

      // Add indexes only if table was created
      try {
        await queryInterface.addIndex('pdf_categories', ['slug'], { name: 'pdf_categories_slug' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdf_categories_slug already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdf_categories', ['is_active'], { name: 'pdf_categories_is_active' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdf_categories_is_active already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdf_categories', ['sort_order'], { name: 'pdf_categories_sort_order' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdf_categories_sort_order already exists, skipping...');
      }
    } else {
      console.log('pdf_categories table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('pdf_categories', ['slug'], { name: 'pdf_categories_slug' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdf_categories_slug already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdf_categories', ['is_active'], { name: 'pdf_categories_is_active' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdf_categories_is_active already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('pdf_categories', ['sort_order'], { name: 'pdf_categories_sort_order' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index pdf_categories_sort_order already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pdf_categories');
  }
};