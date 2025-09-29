'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admins', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
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
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1
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

    // Add indexes
    await queryInterface.addIndex('admins', ['email'], { name: 'admins_email' });
    await queryInterface.addIndex('admins', ['role'], { name: 'admins_role' });
    await queryInterface.addIndex('admins', ['isActive'], { name: 'admins_is_active' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('admins');
  }
};