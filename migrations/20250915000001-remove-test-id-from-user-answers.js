'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if test_id column exists in user_answers table
      const tableDescription = await queryInterface.describeTable('user_answers');

      if (tableDescription.test_id) {
        console.log('Removing test_id column from user_answers table...');
        await queryInterface.removeColumn('user_answers', 'test_id');
        console.log('✅ Successfully removed test_id column from user_answers');
      } else {
        console.log('test_id column does not exist in user_answers table, no action needed');
      }
    } catch (error) {
      console.log('Error checking/removing test_id column:', error.message);
      // Don't throw error if column doesn't exist
      if (!error.message.includes("doesn't exist") && !error.message.includes("Unknown column")) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // In case we need to rollback, we won't add the column back
    // since it shouldn't exist in the first place
    console.log('Rollback: test_id column should not exist in user_answers table');
  }
};