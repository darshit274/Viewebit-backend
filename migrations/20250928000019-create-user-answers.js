'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('user_answers')) {
      // user_answers already exists (created by 20240101000011-create-user-answers.js, which
      // already provides user_id, test_id, question_id, selected_option, is_correct,
      // time_taken, marks_obtained, created_at, updated_at - a different, legacy shape). Bring
      // it up to the current model shape additively; old columns are left in place rather than
      // dropped so nothing is destructive.
      const desc = await queryInterface.describeTable('user_answers');

      if (!desc.test_session_id) {
        // Primary key type change (UUID -> auto-increment INTEGER): nothing references
        // user_answers.id via FK, so this is safe to do in place without losing data - the old
        // UUID id is preserved under a new column name rather than dropped.
        await queryInterface.sequelize.query('ALTER TABLE user_answers DROP PRIMARY KEY');
        await queryInterface.renameColumn('user_answers', 'id', 'legacy_uuid_id');
        await queryInterface.sequelize.query(
          'ALTER TABLE user_answers ADD COLUMN id INT NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)'
        );

        await queryInterface.addColumn('user_answers', 'test_session_id', {
          type: Sequelize.CHAR(36),
          allowNull: true,
          references: {
            model: 'test_sessions',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
        await queryInterface.addColumn('user_answers', 'time_spent', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
          comment: 'Time spent on this question in seconds'
        });
        await queryInterface.addColumn('user_answers', 'is_flagged', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false
        });
        await queryInterface.addColumn('user_answers', 'is_visited', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false
        });

        await queryInterface.addIndex('user_answers', ['test_session_id'], { name: 'user_answers_test_session_id' });
      }

      // question_id was declared UUID referencing the pre-reset questions.id (which was itself
      // UUID at the time). Since questions.id is now an auto-increment INTEGER (see
      // 20250928000016-create-questions.js), drop any stale FK constraint left over from the
      // reset and retype/re-link this column.
      const [staleFks] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_answers'
          AND COLUMN_NAME = 'question_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      for (const row of staleFks) {
        await queryInterface.removeConstraint('user_answers', row.CONSTRAINT_NAME);
      }

      const currentDesc = await queryInterface.describeTable('user_answers');
      if (currentDesc.question_id && currentDesc.question_id.type.toUpperCase().includes('CHAR')) {
        await queryInterface.changeColumn('user_answers', 'question_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        });
      }

      const [existingFk] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_answers'
          AND COLUMN_NAME = 'question_id'
          AND REFERENCED_TABLE_NAME = 'questions'
      `);
      if (existingFk.length === 0) {
        await queryInterface.addConstraint('user_answers', {
          fields: ['question_id'],
          type: 'foreign key',
          name: 'user_answers_question_id_fkey',
          references: { table: 'questions', field: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
      }

      const [existingUniqueIdx] = await queryInterface.sequelize.query(`
        SELECT INDEX_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_answers'
          AND INDEX_NAME = 'unique_session_question'
      `);
      if (existingUniqueIdx.length === 0 && currentDesc.test_session_id) {
        await queryInterface.addIndex('user_answers', ['test_session_id', 'question_id'], {
          name: 'unique_session_question',
          unique: true
        });
      }

      return;
    }

    await queryInterface.createTable('user_answers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      test_session_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'test_sessions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'questions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      selected_option: {
        type: Sequelize.ENUM('A', 'B', 'C', 'D'),
        allowNull: true
      },
      is_correct: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      time_spent: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Time spent on this question in seconds'
      },
      is_flagged: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      is_visited: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('user_answers', ['test_session_id'], { name: 'user_answers_test_session_id' });
    await queryInterface.addIndex('user_answers', ['question_id'], { name: 'user_answers_question_id' });

    // Add unique constraint
    await queryInterface.addIndex('user_answers', ['test_session_id', 'question_id'], {
      name: 'unique_session_question',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_answers');
  }
};