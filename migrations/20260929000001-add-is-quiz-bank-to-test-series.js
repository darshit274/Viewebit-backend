'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('new_test_series');
    if (!table.is_quiz_bank) {
      await queryInterface.addColumn('new_test_series', 'is_quiz_bank', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True for the auto-created private container an educator\'s inline course quizzes live under — never shown in student-facing test series listings'
      });
    }

    // Backfill: mark any existing quiz-bank containers so they stop showing
    // up in student listings immediately, without waiting for a re-create.
    // Two passes: the FK an educator currently points at, plus a fallback
    // match on the exact name/description getOrCreateQuizBank always uses —
    // catches orphaned duplicates from earlier bugs/races that no educator's
    // cached pointer references any more.
    await queryInterface.sequelize.query(`
      UPDATE new_test_series
      SET is_quiz_bank = true
      WHERE id IN (
        SELECT quiz_bank_test_series_id FROM educators WHERE quiz_bank_test_series_id IS NOT NULL
      )
    `);
    await queryInterface.sequelize.query(`
      UPDATE new_test_series
      SET is_quiz_bank = true
      WHERE name LIKE '%— Quiz Bank'
        AND description = 'Private container for this educator\\'s own quiz categories. Not shown to students directly.'
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('new_test_series', 'is_quiz_bank');
  }
};
