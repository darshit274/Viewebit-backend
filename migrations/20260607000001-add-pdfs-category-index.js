'use strict';

/**
 * Index pdfs.category_id and (category_id, display_order) so the upload
 * endpoint's "find max display_order for this category" query — and every
 * "list pdfs in this category in order" query — stops scanning the full table.
 *
 * Without this, the new hierarchy upload runs a full table scan on every
 * upload (because MAX on a non-indexed column needs to look at every row),
 * which is the only meaningful reason the new flow can be slower than the
 * legacy flow on a populated production database.
 */
module.exports = {
  async up(queryInterface) {
    // Pull existing indexes so we don't try to add a duplicate
    const existing = (await queryInterface.showIndex('pdfs')).map((i) => i.name);

    if (!existing.includes('pdfs_category_id_display_order')) {
      await queryInterface.addIndex('pdfs', ['category_id', 'display_order'], {
        name: 'pdfs_category_id_display_order',
      });
    }

    // Also index test_series_id since the access check / listing queries hit it
    if (!existing.includes('pdfs_test_series_id')) {
      await queryInterface.addIndex('pdfs', ['test_series_id'], {
        name: 'pdfs_test_series_id',
      });
    }
  },

  async down(queryInterface) {
    const existing = (await queryInterface.showIndex('pdfs')).map((i) => i.name);
    if (existing.includes('pdfs_category_id_display_order')) {
      await queryInterface.removeIndex('pdfs', 'pdfs_category_id_display_order');
    }
    if (existing.includes('pdfs_test_series_id')) {
      await queryInterface.removeIndex('pdfs', 'pdfs_test_series_id');
    }
  },
};
