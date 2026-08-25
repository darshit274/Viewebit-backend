'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('subscription')) {
      // subscription already exists (created by 20240101000010-create-subscriptions.js, which
      // already provides id, user_id (correctly UUID referencing users.uuid), transaction_id,
      // payment_method, amount_paid, currency, status, purchase_date, expiry_date, created_at,
      // updated_at). Bring it up to the current model shape additively.
      const desc = await queryInterface.describeTable('subscription');

      // test_series_id was declared UUID NOT NULL referencing the pre-reset test_series.id
      // (which was itself UUID at the time). Since test_series.id is now an auto-increment
      // INTEGER (see 20250928000008-create-test-series.js), drop any stale FK constraint left
      // over from the reset and retype/re-link this column as nullable INTEGER.
      const [staleFks] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'subscription'
          AND COLUMN_NAME = 'test_series_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      for (const row of staleFks) {
        await queryInterface.removeConstraint('subscription', row.CONSTRAINT_NAME);
      }

      if (desc.test_series_id && (desc.test_series_id.type.toUpperCase().includes('CHAR') || desc.test_series_id.allowNull === false)) {
        await queryInterface.changeColumn('subscription', 'test_series_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      }

      const [existingFk] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'subscription'
          AND COLUMN_NAME = 'test_series_id'
          AND REFERENCED_TABLE_NAME = 'test_series'
      `);
      if (existingFk.length === 0) {
        await queryInterface.addConstraint('subscription', {
          fields: ['test_series_id'],
          type: 'foreign key',
          name: 'subscription_test_series_id_fkey',
          references: { table: 'test_series', field: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        });
      }

      if (!desc.metadata) {
        await queryInterface.addColumn('subscription', 'metadata', {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Additional metadata for the subscription (payment details, PDF info, etc.)'
        });
      }

      return;
    }

    await queryInterface.createTable('subscription', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      payment_method: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      amount_paid: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'INR'
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: true,
        defaultValue: 'pending'
      },
      purchase_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      expiry_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for the subscription (payment details, PDF info, etc.)'
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
    await queryInterface.addIndex('subscription', ['user_id'], { name: 'subscription_user_id' });
    await queryInterface.addIndex('subscription', ['test_series_id'], { name: 'subscription_test_series_id' });
    await queryInterface.addIndex('subscription', ['status'], { name: 'subscription_status' });
    await queryInterface.addIndex('subscription', ['transaction_id'], { name: 'subscription_transaction_id' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subscription');
  }
};