module.exports = (sequelize, DataTypes) => {
  const TestSession = sequelize.define('TestSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false
    },
    
    // Associations
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    
    // Session metadata
    attempt_number: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    status: {
      type: DataTypes.ENUM('not_started', 'in_progress', 'paused', 'completed', 'timed_out', 'abandoned', 'terminated'),
      defaultValue: 'not_started'
    },
    
    // Time tracking
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_activity_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paused_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resumed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Duration tracking
    total_time_spent: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    pause_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    remaining_time: {
      type: DataTypes.INTEGER
    },
    pause_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Progress tracking
    current_question_id: {
      type: DataTypes.INTEGER
    },
    current_question_index: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    questions_visited: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    questions_answered: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    questions_flagged: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // User preferences
    selected_language: {
      type: DataTypes.STRING(10),
      defaultValue: 'en'
    },
    font_size: {
      type: DataTypes.ENUM('small', 'medium', 'large'),
      defaultValue: 'medium'
    },
    
    // Results (populated after completion)
    total_score: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0
    },
    max_possible_score: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    correct_answers: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    wrong_answers: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    unanswered: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    negative_marks: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0
    },
    
    // Performance metrics
    rank: {
      type: DataTypes.INTEGER
    },
    percentile: {
      type: DataTypes.DECIMAL(5, 2)
    },
    grade: {
      type: DataTypes.STRING(5)
    },
    is_passed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    // Security and tracking
    user_agent: {
      type: DataTypes.TEXT
    },
    ip_address: {
      type: DataTypes.INET
    },
    tab_switches: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    fullscreen_exits: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Session state (JSON for complex data)
    session_data: {
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
    tableName: 'test_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  TestSession.associate = function(models) {
    // User association
    TestSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Test association
    TestSession.belongsTo(models.Test, {
      foreignKey: 'test_id',
      as: 'test'
    });

    // Test series association
    TestSession.belongsTo(models.TestSeries, {
      foreignKey: 'test_series_id',
      as: 'testSeries'
    });

    // User answers for this session
    TestSession.hasMany(models.UserAnswer, {
      foreignKey: 'session_id',
      as: 'answers'
    });
  };

  return TestSession;
};