'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('new_test_series', 'display_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'is_course_closed'
    });

    // Initialise existing rows so order matches their current creation order
    await queryInterface.sequelize.query(`
      UPDATE new_test_series ts
      JOIN (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
        FROM new_test_series
      ) ranked ON ts.id = ranked.id
      SET ts.display_order = ranked.rn
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('new_test_series', 'display_order');
  }
};
