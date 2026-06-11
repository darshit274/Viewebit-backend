module.exports = (sequelize, DataTypes) => {
  const LeaderboardEntry = sequelize.define('LeaderboardEntry', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'uuid'
      }
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tests',
        key: 'id'
      }
    },
    test_session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'test_sessions',
        key: 'id'
      }
    },
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'test_series',
        key: 'id'
      }
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'For category-based leaderboards'
    },
    score: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    final_score: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_questions: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    correct_answers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    wrong_answers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    unanswered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    time_taken_seconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total time taken to complete the test'
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Calculated rank for this test'
    },
    percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Percentile score (0-100)'
    },
    completion_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When the test was completed'
    },
    is_valid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'False for tests that should be excluded from rankings'
    }
  }, {
    tableName: 'leaderboard_entries',
    timestamps: true,
    underscored: true
  });

  LeaderboardEntry.associate = function(models) {
    LeaderboardEntry.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    LeaderboardEntry.belongsTo(models.Test, {
      foreignKey: 'test_id',
      as: 'test'
    });
    
    LeaderboardEntry.belongsTo(models.TestSession, {
      foreignKey: 'test_session_id',
      as: 'testSession'
    });
    
    LeaderboardEntry.belongsTo(models.TestSeries, {
      foreignKey: 'test_series_id',
      as: 'testSeries'
    });
    
    LeaderboardEntry.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });
  };

  return LeaderboardEntry;
};