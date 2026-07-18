'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('users');

    if (!tableDescription.institution_id) {
      await queryInterface.addColumn('users', 'institution_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'institutions',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    if (!tableDescription.branch_id) {
      await queryInterface.addColumn('users', 'branch_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    if (!tableDescription.department_id) {
      await queryInterface.addColumn('users', 'department_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    if (!tableDescription.application_status) {
      await queryInterface.addColumn('users', 'application_status', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'enrolled'),
        allowNull: false,
        defaultValue: 'pending'
      });
    }

    if (!tableDescription.applied_at) {
      await queryInterface.addColumn('users', 'applied_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('users');
    if (tableDescription.applied_at) await queryInterface.removeColumn('users', 'applied_at');
    if (tableDescription.application_status) await queryInterface.removeColumn('users', 'application_status');
    if (tableDescription.department_id) await queryInterface.removeColumn('users', 'department_id');
    if (tableDescription.branch_id) await queryInterface.removeColumn('users', 'branch_id');
    if (tableDescription.institution_id) await queryInterface.removeColumn('users', 'institution_id');
  }
};
