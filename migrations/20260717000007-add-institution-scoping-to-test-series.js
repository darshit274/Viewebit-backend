'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('new_test_series');

    if (!tableDescription.institution_id) {
      await queryInterface.addColumn('new_test_series', 'institution_id', {
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
      await queryInterface.addColumn('new_test_series', 'branch_id', {
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
      await queryInterface.addColumn('new_test_series', 'department_id', {
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
    const tableDescription = await queryInterface.describeTable('new_test_series');
    if (tableDescription.department_id) await queryInterface.removeColumn('new_test_series', 'department_id');
    if (tableDescription.branch_id) await queryInterface.removeColumn('new_test_series', 'branch_id');
    if (tableDescription.institution_id) await queryInterface.removeColumn('new_test_series', 'institution_id');
  }
};
