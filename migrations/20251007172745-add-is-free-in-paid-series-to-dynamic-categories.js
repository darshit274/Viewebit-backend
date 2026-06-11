'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('categories', 'is_free_in_paid_series', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, this category quiz is free even if the parent test series is paid'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('categories', 'is_free_in_paid_series');
  }
};
