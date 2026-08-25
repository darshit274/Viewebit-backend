'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('pdfs')) {
      // pdfs already exists (created by 20240101000016-update-pdfs-for-uploads.js, which
      // already provides id, title, description, category_id, file_path, original_filename,
      // file_size, mime_type, access_level, test_series_id, exam_type_id, tags,
      // download_count, view_count, is_active, is_featured, uploaded_by (with its FK to
      // admins.id already correct), created_at, updated_at). Bring it up to the current
      // model shape additively instead of re-creating.
      const desc = await queryInterface.describeTable('pdfs');

      // test_series_id was declared UUID referencing the pre-reset test_series.id (which was
      // itself UUID at the time). Since test_series.id is now an auto-increment INTEGER (see
      // 20250928000008-create-test-series.js), drop any stale FK constraint left over from the
      // reset and retype/re-link this column.
      const [staleFks] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pdfs'
          AND COLUMN_NAME = 'test_series_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      for (const row of staleFks) {
        await queryInterface.removeConstraint('pdfs', row.CONSTRAINT_NAME);
      }

      if (desc.test_series_id && desc.test_series_id.type.toUpperCase().includes('CHAR')) {
        await queryInterface.changeColumn('pdfs', 'test_series_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      }

      const [existingFk] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pdfs'
          AND COLUMN_NAME = 'test_series_id'
          AND REFERENCED_TABLE_NAME = 'test_series'
      `);
      if (existingFk.length === 0) {
        await queryInterface.addConstraint('pdfs', {
          fields: ['test_series_id'],
          type: 'foreign key',
          name: 'pdfs_test_series_id_fkey',
          references: { table: 'test_series', field: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        });
      }

      // Pricing columns added in the redesigned schema - genuinely missing from the old table.
      const pricingColumns = {
        price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00, comment: 'Price for premium PDFs' },
        currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'INR', comment: 'Currency for pricing' },
        is_free: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, comment: 'Whether the PDF is free to access' },
        discount_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00, comment: 'Discount percentage if any' },
        subscription_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Whether subscription is required to access' },
        preview_pages: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: 'Number of preview pages available for free' }
      };
      for (const [name, definition] of Object.entries(pricingColumns)) {
        if (!desc[name]) {
          await queryInterface.addColumn('pdfs', name, definition);
        }
      }

      return;
    }

    await queryInterface.createTable('pdfs', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Display title for the PDF'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'pdf_categories',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      file_path: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Server path to the PDF file'
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original filename when uploaded'
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'File size in bytes'
      },
      mime_type: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'application/pdf',
        comment: 'MIME type of the file'
      },
      access_level: {
        type: Sequelize.ENUM('free', 'premium', 'restricted'),
        allowNull: true,
        defaultValue: 'free',
        comment: 'Who can access this PDF'
      },
      test_series_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        comment: 'Link to specific test series if applicable'
      },
      exam_type_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'exam_types',
          key: 'id'
        },
        comment: 'Link to exam type if applicable'
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of tags for better search'
      },
      download_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of times downloaded'
      },
      view_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of times viewed'
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1
      },
      is_featured: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      uploaded_by: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        comment: 'Admin who uploaded this PDF'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Price for premium PDFs'
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'INR',
        comment: 'Currency for pricing'
      },
      is_free: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: 'Whether the PDF is free to access'
      },
      discount_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Discount percentage if any'
      },
      subscription_required: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Whether subscription is required to access'
      },
      preview_pages: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of preview pages available for free'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('pdfs', ['category_id'], { name: 'pdfs_category_id' });
    await queryInterface.addIndex('pdfs', ['test_series_id'], { name: 'pdfs_test_series_id' });
    await queryInterface.addIndex('pdfs', ['exam_type_id'], { name: 'pdfs_exam_type_id' });
    await queryInterface.addIndex('pdfs', ['access_level'], { name: 'pdfs_access_level' });
    await queryInterface.addIndex('pdfs', ['is_active'], { name: 'pdfs_is_active' });
    await queryInterface.addIndex('pdfs', ['is_featured'], { name: 'pdfs_is_featured' });
    await queryInterface.addIndex('pdfs', ['created_at'], { name: 'pdfs_created_at' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pdfs');
  }
};