'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_categories', {
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
      educator_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'educators',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
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

    await queryInterface.addIndex('course_categories', ['educator_id'], { name: 'idx_course_categories_educator' });
    await queryInterface.addConstraint('course_categories', {
      fields: ['educator_id', 'name'],
      type: 'unique',
      name: 'uq_course_categories_educator_name'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('course_categories');
  }
};
