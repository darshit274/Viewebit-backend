module.exports = (sequelize, DataTypes) => {
  const TestSession = sequelize.define('TestSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_submitted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    remaining_time_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    current_question_index: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    total_questions: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    session_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    answers_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    calculated_score: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    total_correct: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    total_wrong: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    total_unanswered: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    total_marked_for_review: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'completed', 'expired', 'cancelled'),
      defaultValue: 'active',
      allowNull: false
    }
  }, {
    tableName: 'test_sessions',
    underscored: true,
    timestamps: true
  });

  TestSession.associate = function(models) {
    TestSession.belongsTo(models.User, { 
      foreignKey: 'user_id', 
      as: 'user' 
    });
    TestSession.belongsTo(models.Test, { 
      foreignKey: 'test_id', 
      as: 'test' 
    });
  };

  return TestSession;
};