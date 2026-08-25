'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('admins', 'role', {
      type: Sequelize.ENUM('super_admin', 'admin', 'moderator', 'institution_admin', 'branch_admin'),
      allowNull: false,
      defaultValue: 'admin'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('admins', 'role', {
      type: Sequelize.ENUM('super_admin', 'admin', 'moderator'),
      allowNull: false,
      defaultValue: 'admin'
    });
  }
};
