'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if notifications table exists
    const tableExists = await queryInterface.tableExists('notifications');
    
    if (!tableExists) {
      await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
        references: {
          model: 'users',
          key: 'uuid'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('quiz_reminder', 'test_result', 'new_content', 'subscription', 'general'),
        allowNull: false,
        defaultValue: 'general'
      },
      data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      topic: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'delivered', 'failed', 'read'),
        allowNull: false,
        defaultValue: 'pending'
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      read_at: {
        type: Sequelize.DATE,
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
        await queryInterface.addIndex('notifications', ['user_id'], { name: 'notifications_user_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_user_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('notifications', ['type'], { name: 'notifications_type' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_type already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('notifications', ['status'], { name: 'notifications_status' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_status already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('notifications', ['created_at'], { name: 'notifications_created_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_created_at already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('notifications', ['user_id', 'read_at'], { name: 'notifications_user_id_read_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_user_id_read_at already exists, skipping...');
      }
    } else {
      console.log('notifications table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('notifications', ['user_id'], { name: 'notifications_user_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_user_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('notifications', ['type'], { name: 'notifications_type' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_type already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('notifications', ['status'], { name: 'notifications_status' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_status already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('notifications', ['created_at'], { name: 'notifications_created_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_created_at already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('notifications', ['user_id', 'read_at'], { name: 'notifications_user_id_read_at' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index notifications_user_id_read_at already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notifications');
  }
};