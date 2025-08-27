'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if sub_categories table exists
    const tableExists = await queryInterface.tableExists('sub_categories');
    
    if (!tableExists) {
      await queryInterface.createTable('sub_categories', {
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
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
        comment: 'Sub-category name in Gujarati'
      },
      description_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Sub-category description in Gujarati'
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
        await queryInterface.addIndex('sub_categories', ['category_id'], { name: 'category_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index category_id already exists, skipping...');
      }
    } else {
      console.log('sub_categories table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('sub_categories', ['category_id'], { name: 'category_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index category_id already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sub_categories');
  }
};