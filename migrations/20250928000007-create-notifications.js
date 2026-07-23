'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
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

    // Add indexes
    await queryInterface.addIndex('notifications', ['user_id'], { name: 'notifications_user_id' });
    await queryInterface.addIndex('notifications', ['type'], { name: 'notifications_type' });
    await queryInterface.addIndex('notifications', ['status'], { name: 'notifications_status' });
    await queryInterface.addIndex('notifications', ['created_at'], { name: 'notifications_created_at' });
    await queryInterface.addIndex('notifications', ['user_id', 'read_at'], { name: 'notifications_user_id_read_at' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
  }
};