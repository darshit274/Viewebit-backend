module.exports = (sequelize, DataTypes) => {
  const Test = sequelize.define('Test', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    title_gujarati: {
      type: DataTypes.STRING(400),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Association
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    
    // Test configuration
    test_type: {
      type: DataTypes.ENUM('practice', 'mock', 'assessment', 'sample', 'full_length'),
      defaultValue: 'practice'
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    total_questions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_marks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    passing_marks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Access control
    is_free: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_one_time: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    allows_pause: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    max_attempts: {
      type: DataTypes.INTEGER
    },
    
    // Marking scheme
    has_negative_marking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    negative_marks: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0
    },
    marks_per_question: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    
    // Scheduling
    available_from: {
      type: DataTypes.DATE,
      allowNull: true
    },
    available_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Features
    show_results_immediately: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    show_correct_answers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    show_explanations: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    supports_multilanguage: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // Instructions
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructions_gujarati: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Status and ordering
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Analytics (updated via triggers/jobs)
    total_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    average_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    average_time: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
    tableName: 'tests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  Test.associate = function(models) {
    // Test series association
    Test.belongsTo(models.TestSeries, {
      foreignKey: 'test_series_id',
      as: 'testSeries'
    });

    // Questions in this test
    Test.hasMany(models.Question, {
      foreignKey: 'test_id',
      as: 'questions'
    });

    // Test sessions
    Test.hasMany(models.TestSession, {
      foreignKey: 'test_id',
      as: 'sessions'
    });

    // User answers for this test
    Test.hasMany(models.UserAnswer, {
      foreignKey: 'test_id',
      as: 'userAnswers'
    });

    // Analytics
    Test.hasMany(models.TestAnalytics, {
      foreignKey: 'test_id',
      as: 'analytics'
    });
  };

  return Test;
};