'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('assessment_settings')) {
      return;
    }

    await queryInterface.createTable('assessment_settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: false
      },
      intro_video_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('assessment_settings');
  }
};
