module.exports = (sequelize, DataTypes) => {
  const TestAnalytics = sequelize.define('TestAnalytics', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // What this analytics record is for
    analytics_type: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'test_completion', 'question_performance'),
      allowNull: false
    },
    analytics_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    
    // Associations (nullable for aggregate reports)
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    
    // Participation metrics
    unique_users: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    completed_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    abandoned_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Performance metrics
    average_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    highest_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    lowest_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    median_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    
    // Time metrics
    average_completion_time: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    fastest_completion_time: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    slowest_completion_time: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Question-specific metrics (for question_performance type)
    correct_answers: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    wrong_answers: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    skipped_answers: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    accuracy_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    
    // Distribution data (JSON for flexibility)
    score_distribution: {
      type: DataTypes.JSON
    },
    time_distribution: {
      type: DataTypes.JSON
    },
    difficulty_breakdown: {
      type: DataTypes.JSON
    },
    
    // Additional metadata
    metadata: {
      type: DataTypes.JSON
    },
    
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'test_analytics',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  TestAnalytics.associate = function(models) {
    // Test association
    TestAnalytics.belongsTo(models.Test, {
      foreignKey: 'test_id',
      as: 'test'
    });

    // Test series association  
    TestAnalytics.belongsTo(models.TestSeries, {
      foreignKey: 'test_series_id',
      as: 'testSeries'
    });

    // Question association
    TestAnalytics.belongsTo(models.Question, {
      foreignKey: 'question_id',
      as: 'question'
    });
  };

  return TestAnalytics;
};