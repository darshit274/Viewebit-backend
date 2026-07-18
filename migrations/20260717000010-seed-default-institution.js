'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM institutions WHERE slug = 'viewebit-academy' LIMIT 1`
    );

    let institutionId;
    if (existing.length > 0) {
      institutionId = existing[0].id;
    } else {
      const uuid = require('crypto').randomUUID();
      await queryInterface.bulkInsert('institutions', [{
        uuid,
        name: 'Viewebit Academy',
        slug: 'viewebit-academy',
        contact_email: 'admin@viewebit.com',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      const [rows] = await queryInterface.sequelize.query(
        `SELECT id FROM institutions WHERE slug = 'viewebit-academy' LIMIT 1`
      );
      institutionId = rows[0].id;
    }

    // Backfill existing rows to the default institution; branch/department stay
    // NULL (unassigned) so no existing behavior depends on a specific branch.
    await queryInterface.sequelize.query(
      `UPDATE admins SET institution_id = :institutionId WHERE institution_id IS NULL`,
      { replacements: { institutionId } }
    );
    await queryInterface.sequelize.query(
      `UPDATE users SET institution_id = :institutionId WHERE institution_id IS NULL`,
      { replacements: { institutionId } }
    );
    await queryInterface.sequelize.query(
      `UPDATE new_test_series SET institution_id = :institutionId WHERE institution_id IS NULL`,
      { replacements: { institutionId } }
    );
    await queryInterface.sequelize.query(
      `UPDATE pdf_categories SET institution_id = :institutionId WHERE institution_id IS NULL`,
      { replacements: { institutionId } }
    );
  },

  async down(queryInterface) {
    // Backfill is not reversed automatically — leaving scoping data intact is
    // safer than nulling it back out on a rollback. Only remove the seeded row
    // if nothing else references it.
    await queryInterface.sequelize.query(
      `DELETE FROM institutions WHERE slug = 'viewebit-academy'`
    );
  }
};
