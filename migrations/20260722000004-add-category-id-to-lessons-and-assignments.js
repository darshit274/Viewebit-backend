'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const lessonsTable = await queryInterface.describeTable('lessons');
    if (!lessonsTable.category_id) {
      await queryInterface.addColumn('lessons', 'category_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    const assignmentsTable = await queryInterface.describeTable('assignments');
    if (!assignmentsTable.category_id) {
      await queryInterface.addColumn('assignments', 'category_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down(queryInterface) {
    const lessonsTable = await queryInterface.describeTable('lessons');
    if (lessonsTable.category_id) {
      await queryInterface.removeColumn('lessons', 'category_id');
    }

    const assignmentsTable = await queryInterface.describeTable('assignments');
    if (assignmentsTable.category_id) {
      await queryInterface.removeColumn('assignments', 'category_id');
    }
  }
};
