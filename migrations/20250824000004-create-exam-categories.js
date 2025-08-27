'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if exam_categories table exists
    const tableExists = await queryInterface.tableExists('exam_categories');
    
    if (!tableExists) {
      await queryInterface.createTable('exam_categories', {
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
        allowNull: true,
        comment: 'Category description in Gujarati'
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'exam_categories',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      hierarchy_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      created_by: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

      // Add indexes only if table was created
      try {
        await queryInterface.addIndex('exam_categories', ['parent_id'], { name: 'exam_categories_parent_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index exam_categories_parent_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('exam_categories', ['hierarchy_level'], { name: 'exam_categories_hierarchy_level' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index exam_categories_hierarchy_level already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('exam_categories', ['is_active'], { name: 'exam_categories_is_active' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index exam_categories_is_active already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('exam_categories', ['uuid'], { name: 'exam_categories_uuid' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index exam_categories_uuid already exists, skipping...');
      }
    } else {
      console.log('Exam categories table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('exam_categories', ['parent_id'], { name: 'exam_categories_parent_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index exam_categories_parent_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('exam_categories', ['hierarchy_level'], { name: 'exam_categories_hierarchy_level' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index exam_categories_hierarchy_level already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('exam_categories', ['is_active'], { name: 'exam_categories_is_active' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index exam_categories_is_active already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('exam_categories', ['uuid'], { name: 'exam_categories_uuid' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index exam_categories_uuid already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('exam_categories');
  }
};