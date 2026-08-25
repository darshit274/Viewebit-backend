'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('pdf_categories');

    if (!tableDescription.institution_id) {
      await queryInterface.addColumn('pdf_categories', 'institution_id', {
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
      await queryInterface.addColumn('pdf_categories', 'branch_id', {
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
      await queryInterface.addColumn('pdf_categories', 'department_id', {
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
    const tableDescription = await queryInterface.describeTable('pdf_categories');
    if (tableDescription.department_id) await queryInterface.removeColumn('pdf_categories', 'department_id');
    if (tableDescription.branch_id) await queryInterface.removeColumn('pdf_categories', 'branch_id');
    if (tableDescription.institution_id) await queryInterface.removeColumn('pdf_categories', 'institution_id');
  }
};
