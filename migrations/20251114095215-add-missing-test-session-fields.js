'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'test_sessions';

    async function addIfMissing(column, spec) {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, spec);
      }
    }

    await addIfMissing('final_score', {
      type: Sequelize.DECIMAL(10,2),
      allowNull: true
    });

    await addIfMissing('percentage', {
      type: Sequelize.DECIMAL(5,2),
      allowNull: true
    });

    await addIfMissing('test_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addIfMissing('category_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await addIfMissing('total_marks', {
      type: Sequelize.DECIMAL(10,2),
      allowNull: true
    });

    await addIfMissing('obtained_marks', {
      type: Sequelize.DECIMAL(10,2),
      allowNull: true
    });

    await addIfMissing('negative_marks', {
      type: Sequelize.DECIMAL(10,2),
      allowNull: true
    });

    await addIfMissing('negative_marks_per_wrong', {
      type: Sequelize.DECIMAL(3,2),
      allowNull: true,
      defaultValue: 0
    });

    await addIfMissing('attempted_questions', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addIfMissing('accuracy', {
      type: Sequelize.DECIMAL(5,2),
      allowNull: true
    });

    await addIfMissing('time_spent_seconds', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down(queryInterface) {
    const table = 'test_sessions';

    const cols = [
      'final_score',
      'percentage',
      'test_name',
      'category_name',
      'total_marks',
      'obtained_marks',
      'negative_marks',
      'attempted_questions',
      'accuracy',
      'time_spent_seconds'
    ];

    for (const col of cols) {
      await queryInterface.removeColumn(table, col).catch(() => {});
    }
  }
};
