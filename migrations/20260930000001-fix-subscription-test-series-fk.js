'use strict';

// Repairs a migration-authoring mistake in 20250928000013-create-subscription.js:
// on any database that already had a legacy 'subscription' table before that
// migration ran, it added subscription.test_series_id's FK pointing at the
// old, pre-reset 'test_series' table instead of 'new_test_series' (the table
// TestSeries actually uses - see models/TestSeries.js tableName). Every real
// test_series_id value written by the app (course pricing, test series
// purchases, PDF-linked series) is a new_test_series.id, so any insert/update
// against that FK fails with "Cannot add or update a child row: a foreign key
// constraint fails" - this is what broke Razorpay order creation on
// production. Idempotent: safe to run whether the bad FK, the correct FK, or
// no FK at all currently exists (a from-scratch install never hits the buggy
// branch in the first place).
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('subscription')) return;

    const [badFks] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'subscription'
        AND COLUMN_NAME = 'test_series_id'
        AND REFERENCED_TABLE_NAME = 'test_series'
    `);
    for (const row of badFks) {
      await queryInterface.removeConstraint('subscription', row.CONSTRAINT_NAME);
    }

    const [correctFks] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'subscription'
        AND COLUMN_NAME = 'test_series_id'
        AND REFERENCED_TABLE_NAME = 'new_test_series'
    `);
    if (correctFks.length === 0) {
      await queryInterface.addConstraint('subscription', {
        fields: ['test_series_id'],
        type: 'foreign key',
        name: 'subscription_test_series_id_fkey',
        references: { table: 'new_test_series', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down() {
    // Not reversible to the broken state on purpose.
  }
};
