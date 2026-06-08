'use strict';

/**
 * Make pdf_categories hierarchical (parent/child tree) so PDFs can be organised
 * the same way test-series categories are. Also add display_order to pdfs for
 * sibling ordering inside a leaf category.
 *
 * All columns are added with safe defaults so existing flat categories keep
 * working as root-level "pdf_holder" categories with no parent.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const pdfCatDesc = await queryInterface.describeTable('pdf_categories');

    // uuid — UUID for URL-friendly identifiers (mirrors categories table)
    if (!pdfCatDesc.uuid) {
      await queryInterface.addColumn('pdf_categories', 'uuid', {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        after: 'id',
      });
      // Backfill UUIDs for existing rows (Sequelize default only fires for new INSERTs)
      await queryInterface.sequelize.query(`
        UPDATE pdf_categories SET uuid = UUID() WHERE uuid IS NULL OR uuid = ''
      `);
      // Add unique constraint after backfill
      await queryInterface.addIndex('pdf_categories', ['uuid'], {
        name: 'pdf_categories_uuid_unique',
        unique: true,
      });
    }

    // name_gujarati / description_gujarati — bilingual support
    if (!pdfCatDesc.name_gujarati) {
      await queryInterface.addColumn('pdf_categories', 'name_gujarati', {
        type: Sequelize.TEXT,
        allowNull: true,
        after: 'name',
      });
    }
    if (!pdfCatDesc.description_gujarati) {
      await queryInterface.addColumn('pdf_categories', 'description_gujarati', {
        type: Sequelize.TEXT,
        allowNull: true,
        after: 'description',
      });
    }

    // parent_category_id — self-reference for tree structure
    if (!pdfCatDesc.parent_category_id) {
      await queryInterface.addColumn('pdf_categories', 'parent_category_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'NULL = root category; otherwise references pdf_categories.id',
      });
    }

    // hierarchy_level — depth from root (0 = root)
    if (!pdfCatDesc.hierarchy_level) {
      await queryInterface.addColumn('pdf_categories', 'hierarchy_level', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
    }

    // display_order — sibling ordering (separate from old sort_order to keep semantics clear)
    if (!pdfCatDesc.display_order) {
      await queryInterface.addColumn('pdf_categories', 'display_order', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
      // Seed display_order from sort_order so existing categories keep their order
      await queryInterface.sequelize.query(`
        UPDATE pdf_categories SET display_order = COALESCE(sort_order, 0)
      `);
    }

    // node_type — 'unset' = freshly created (can become container or holder),
    //            'container' = has subcategories only,
    //            'pdf_holder' = directly contains PDFs
    if (!pdfCatDesc.node_type) {
      await queryInterface.addColumn('pdf_categories', 'node_type', {
        type: Sequelize.ENUM('unset', 'container', 'pdf_holder'),
        defaultValue: 'unset',
        allowNull: false,
      });
      // Any existing category that already has PDFs is a pdf_holder leaf
      await queryInterface.sequelize.query(`
        UPDATE pdf_categories pc
        SET node_type = 'pdf_holder'
        WHERE EXISTS (SELECT 1 FROM pdfs p WHERE p.category_id = pc.id LIMIT 1)
      `);
    }

    // slug was previously required + unique. Make it nullable so admins aren't
    // forced to think of URL-slugs for nested categories.
    if (pdfCatDesc.slug && pdfCatDesc.slug.allowNull === false) {
      try {
        await queryInterface.changeColumn('pdf_categories', 'slug', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      } catch (e) {
        // Some MySQL versions complain about unique index when changing column —
        // safe to ignore; the column stays usable.
        console.warn('Could not relax slug column nullability (non-fatal):', e.message);
      }
    }

    // pdfs.display_order — order PDFs inside their leaf category
    const pdfsDesc = await queryInterface.describeTable('pdfs');
    if (!pdfsDesc.display_order) {
      await queryInterface.addColumn('pdfs', 'display_order', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
      // Initialise so the existing creation order is preserved
      await queryInterface.sequelize.query(`
        UPDATE pdfs p
        JOIN (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at ASC, id ASC) AS rn
          FROM pdfs
        ) ranked ON p.id = ranked.id
        SET p.display_order = ranked.rn
      `);
    }
  },

  async down(queryInterface) {
    // Pdfs.display_order
    const pdfsDesc = await queryInterface.describeTable('pdfs');
    if (pdfsDesc.display_order) {
      await queryInterface.removeColumn('pdfs', 'display_order');
    }

    // Hierarchy fields on pdf_categories
    const pdfCatDesc = await queryInterface.describeTable('pdf_categories');
    if (pdfCatDesc.node_type) await queryInterface.removeColumn('pdf_categories', 'node_type');
    if (pdfCatDesc.display_order) await queryInterface.removeColumn('pdf_categories', 'display_order');
    if (pdfCatDesc.hierarchy_level) await queryInterface.removeColumn('pdf_categories', 'hierarchy_level');
    if (pdfCatDesc.parent_category_id) await queryInterface.removeColumn('pdf_categories', 'parent_category_id');
    if (pdfCatDesc.description_gujarati) await queryInterface.removeColumn('pdf_categories', 'description_gujarati');
    if (pdfCatDesc.name_gujarati) await queryInterface.removeColumn('pdf_categories', 'name_gujarati');
    if (pdfCatDesc.uuid) {
      try {
        await queryInterface.removeIndex('pdf_categories', 'pdf_categories_uuid_unique');
      } catch (_) { /* ignore */ }
      await queryInterface.removeColumn('pdf_categories', 'uuid');
    }
  },
};
