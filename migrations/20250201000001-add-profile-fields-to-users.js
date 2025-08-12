'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'fullName', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'phoneNumber', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'dateOfBirth', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'schoolName', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'city', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'state', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'avatarUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'fullName');
    await queryInterface.removeColumn('users', 'phoneNumber');
    await queryInterface.removeColumn('users', 'dateOfBirth');
    await queryInterface.removeColumn('users', 'schoolName');
    await queryInterface.removeColumn('users', 'city');
    await queryInterface.removeColumn('users', 'state');
    await queryInterface.removeColumn('users', 'avatarUrl');
  }
};