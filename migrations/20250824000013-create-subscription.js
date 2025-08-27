'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if subscription table exists
    const tableExists = await queryInterface.tableExists('subscription');
    
    if (!tableExists) {
      await queryInterface.createTable('subscription', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
        references: {
          model: 'users',
          key: 'uuid'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      test_series_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      payment_method: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      amount_paid: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'INR'
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: true,
        defaultValue: 'pending'
      },
      purchase_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      expiry_date: {
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
        await queryInterface.addIndex('subscription', ['user_id'], { name: 'subscription_user_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index subscription_user_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('subscription', ['test_series_id'], { name: 'subscription_test_series_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index subscription_test_series_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('subscription', ['status'], { name: 'subscription_status' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index subscription_status already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('subscription', ['transaction_id'], { name: 'subscription_transaction_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index subscription_transaction_id already exists, skipping...');
      }
    } else {
      console.log('subscription table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('subscription', ['user_id'], { name: 'subscription_user_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index subscription_user_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('subscription', ['test_series_id'], { name: 'subscription_test_series_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index subscription_test_series_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('subscription', ['status'], { name: 'subscription_status' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index subscription_status already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('subscription', ['transaction_id'], { name: 'subscription_transaction_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index subscription_transaction_id already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subscription');
  }
};