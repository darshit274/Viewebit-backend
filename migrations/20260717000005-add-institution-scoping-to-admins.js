'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('admins');

    if (!tableDescription.institution_id) {
      await queryInterface.addColumn('admins', 'institution_id', {
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
      await queryInterface.addColumn('admins', 'branch_id', {
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
      await queryInterface.addColumn('admins', 'department_id', {
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
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('admins');
    if (tableDescription.department_id) await queryInterface.removeColumn('admins', 'department_id');
    if (tableDescription.branch_id) await queryInterface.removeColumn('admins', 'branch_id');
    if (tableDescription.institution_id) await queryInterface.removeColumn('admins', 'institution_id');
  }
};
