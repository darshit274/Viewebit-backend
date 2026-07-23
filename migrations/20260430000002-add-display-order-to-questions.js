'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('questions');
    if (!tableDesc.display_order) {
      await queryInterface.addColumn('questions', 'display_order', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        after: 'question_order'
      });
    }

    // Initialise existing rows so order matches current creation order within each test
    await queryInterface.sequelize.query(`
      UPDATE questions q
      JOIN (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY test_id ORDER BY created_at ASC, id ASC) AS rn
        FROM questions
      ) ranked ON q.id = ranked.id
      SET q.display_order = ranked.rn
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('questions', 'display_order');
  }
};
