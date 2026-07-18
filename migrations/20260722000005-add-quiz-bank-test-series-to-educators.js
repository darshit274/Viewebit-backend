'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('educators');
    if (!tableDescription.quiz_bank_test_series_id) {
      await queryInterface.addColumn('educators', 'quiz_bank_test_series_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'new_test_series',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'A private TestSeries container auto-created to hold this educator\'s own quiz Category tree — never shown directly to students'
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('educators');
    if (tableDescription.quiz_bank_test_series_id) {
      await queryInterface.removeColumn('educators', 'quiz_bank_test_series_id');
    }
  }
};
