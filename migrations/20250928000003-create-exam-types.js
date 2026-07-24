'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    // The 2024 create-exam-types migration already provides every column here
    // (id, name, code, description, is_active, created_at, updated_at) - nothing to do.
    if (tables.includes('exam_types')) {
      return;
    }

    await queryInterface.createTable('exam_types', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Exam name (e.g., "Deputy Section Officer", "PSI", "GPSC")'
      },
      code: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Short code for exam (e.g., "DSO", "PSI", "GPSC")'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('exam_types');
  }
};