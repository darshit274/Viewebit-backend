'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_category_links', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      course_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'course_categories',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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

    await queryInterface.addConstraint('course_category_links', {
      fields: ['course_id', 'course_category_id'],
      type: 'unique',
      name: 'uq_course_category_links_pair'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('course_category_links');
  }
};
