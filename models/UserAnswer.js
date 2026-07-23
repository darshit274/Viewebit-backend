module.exports = (sequelize, DataTypes) => {
  const UserAnswer = sequelize.define('UserAnswer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    test_session_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'test_sessions',
        key: 'id'
      }
    },
    question_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'questions',
        key: 'id'
      }
    },
    selected_option: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      allowNull: true
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    time_spent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Time spent on this question in seconds'
    },
    is_flagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_visited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'user_answers',
    timestamps: true,
    underscored: true
  });

  UserAnswer.associate = function(models) {
    UserAnswer.belongsTo(models.TestSession, {
      foreignKey: 'test_session_id',
      as: 'testSession'
    });
    
    UserAnswer.belongsTo(models.Question, {
      foreignKey: 'question_id',
      as: 'question'
    });
  };

  return UserAnswer;
};