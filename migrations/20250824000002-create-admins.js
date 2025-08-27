'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if admins table exists
    const tableExists = await queryInterface.tableExists('admins');
    
    if (!tableExists) {
      await queryInterface.createTable('admins', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('super_admin', 'admin', 'moderator'),
        allowNull: false,
        defaultValue: 'admin'
      },
      avatar: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: true
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
        await queryInterface.addIndex('admins', ['email'], { name: 'admins_email' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index admins_email already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('admins', ['role'], { name: 'admins_role' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index admins_role already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('admins', ['isActive'], { name: 'admins_is_active' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index admins_is_active already exists, skipping...');
      }
    } else {
      console.log('Admins table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('admins', ['email'], { name: 'admins_email' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index admins_email already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('admins', ['role'], { name: 'admins_role' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index admins_role already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('admins', ['isActive'], { name: 'admins_is_active' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index admins_is_active already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('admins');
  }
};