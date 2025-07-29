module.exports = (sequelize, DataTypes) => {
  const UserAnswer = sequelize.define('UserAnswer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Associations
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    
    // Answer data
    selected_option: {
      type: DataTypes.STRING(1),
      allowNull: true
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_flagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    // Timing and behavior
    time_taken: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    first_visit_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_visit_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    visit_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Scoring
    marks_obtained: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    marks_possible: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1
    },
    
    // User behavior tracking
    option_changes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    confidence_level: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: true
    },
    
    // Language and display
    language_used: {
      type: DataTypes.STRING(10),
      defaultValue: 'en'
    },
    
    // Additional metadata
    answer_sequence: {
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
    tableName: 'user_answers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  UserAnswer.associate = function(models) {
    // User association
    UserAnswer.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Question association
    UserAnswer.belongsTo(models.Question, {
      foreignKey: 'question_id',
      as: 'question'
    });

    // Test association
    UserAnswer.belongsTo(models.Test, {
      foreignKey: 'test_id',
      as: 'test'
    });

    // Session association
    UserAnswer.belongsTo(models.TestSession, {
      foreignKey: 'session_id',
      as: 'session'
    });
  };

  return UserAnswer;
};