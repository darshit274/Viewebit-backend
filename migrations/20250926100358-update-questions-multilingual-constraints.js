'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Update questions table to allow NULL for English fields
    // This enables multilingual support where questions can be Gujarati-only, English-only, or both

    await queryInterface.changeColumn('questions', 'question_text', {
      type: Sequelize.TEXT,
      allowNull: true // Changed from false to true
    });

    await queryInterface.changeColumn('questions', 'option_a', {
      type: Sequelize.TEXT,
      allowNull: true // Changed from false to true
    });

    await queryInterface.changeColumn('questions', 'option_b', {
      type: Sequelize.TEXT,
      allowNull: true // Changed from false to true
    });

    await queryInterface.changeColumn('questions', 'option_c', {
      type: Sequelize.TEXT,
      allowNull: true // Changed from false to true
    });

    await queryInterface.changeColumn('questions', 'option_d', {
      type: Sequelize.TEXT,
      allowNull: true // Changed from false to true
    });

    console.log('✅ Updated questions table to support multilingual import (English fields now nullable)');
  },

  async down (queryInterface, Sequelize) {
    // Revert back to NOT NULL constraints (this may fail if there are NULL values)

    await queryInterface.changeColumn('questions', 'question_text', {
      type: Sequelize.TEXT,
      allowNull: false // Reverted to false
    });

    await queryInterface.changeColumn('questions', 'option_a', {
      type: Sequelize.TEXT,
      allowNull: false // Reverted to false
    });

    await queryInterface.changeColumn('questions', 'option_b', {
      type: Sequelize.TEXT,
      allowNull: false // Reverted to false
    });

    await queryInterface.changeColumn('questions', 'option_c', {
      type: Sequelize.TEXT,
      allowNull: false // Reverted to false
    });

    await queryInterface.changeColumn('questions', 'option_d', {
      type: Sequelize.TEXT,
      allowNull: false // Reverted to false
    });

    console.log('⚠️ Reverted questions table constraints (English fields now NOT NULL again)');
  }
};
