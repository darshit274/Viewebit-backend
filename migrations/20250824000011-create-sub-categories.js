'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sub_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      name_gujarati: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Sub-category name in Gujarati'
      },
      description_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Sub-category description in Gujarati'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
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
    await queryInterface.addIndex('sub_categories', ['category_id'], { name: 'category_id' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sub_categories');
  }
};