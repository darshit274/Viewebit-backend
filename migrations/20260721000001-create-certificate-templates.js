'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('certificate_templates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      background_image_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      title_text: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'Certificate of Completion'
      },
      body_text_template: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_default: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0
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

  async down(queryInterface) {
    await queryInterface.dropTable('certificate_templates');
  }
};
