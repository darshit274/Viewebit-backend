'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('educators', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      institution_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'institutions',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      branch_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
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
      avatar: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      designation: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      employee_code: {
        type: Sequelize.STRING(100),
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
      otp: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      otpExpiry: {
        type: Sequelize.DATE,
        allowNull: true
      },
      current_session_id: {
        type: Sequelize.STRING(36),
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

    await queryInterface.addIndex('educators', ['email'], { name: 'idx_educators_email' });
    await queryInterface.addIndex('educators', ['institution_id'], { name: 'idx_educators_institution' });
    await queryInterface.addIndex('educators', ['branch_id'], { name: 'idx_educators_branch' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('educators');
  }
};
